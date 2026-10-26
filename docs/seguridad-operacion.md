# Cabeceras, secretos y respaldo

Operación de GeldFlus. No rota secretos por sí sola: el JWT se cambia solo cuando backend y payments ya rechazan el `jti`.

## Cabeceras

El middleware del front las pone en la respuesta que llega al navegador.

| Cabecera | Valor |
| --- | --- |
| Content-Security-Policy | Distinta para el panel, el puente de Webpay y el JSON |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains`, solo si la petición es HTTPS |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |

También van `X-Content-Type-Options: nosniff` y una Permissions-Policy que apaga cámara, micrófono, geolocalización y Payment Request. Webpay no usa Payment Request: el navegador navega al puente y ese HTML hace POST a Transbank.

HSTS con `includeSubDomains` exige que todo subdominio de ese host hable HTTPS. No se envía en `http://`, para no pinnear un entorno local.

La política del panel permite el script de tema de `index.html` por hash, las fuentes de Google, las marcas de Khipu y Fintoc, y `blob:` para adjuntos del chat. No permite scripts inline sueltos. Si se edita ese script, el test `securityHeaders.test.ts` falla hasta que el hash de `securityHeaders.ts` vuelva a coincidir.

El puente (`/api/public/webpay/bridge/:id`) lleva otra política. El único script permitido es `document.getElementById('f').submit();`, el mismo de `flowpay-payments/internal/controller/webpay_controller.go`. `form-action` solo acepta `https://webpay3g.transbank.cl` y `https://webpay3gint.transbank.cl`. Si payments cambia ese script o Transbank cambia de host, el salto se corta hasta actualizar `securityHeaders.ts`.

Después de tocar la política, probar login, un cobro y un pago que llegue a Webpay.

## Secretos

`.env` está en `.gitignore` de los cuatro repos y no forma parte del árbol de git. Los ejemplos que sí están en el repo van vacíos.

Nada de esto se rota en este cambio. El `jti` ya lo firma el SSO. Backend y payments cargan `revoked_access_tokens` al arrancar y la vuelven a leer cada 5 segundos. Un cierre de sesión tarda como máximo ese intervalo en llegar a los otros dos procesos. Validar la firma no consulta la base en cada petición. Un access token sin `jti` se rechaza.

### JWT

El mismo secreto firma y verifica. Hay que cambiarlo en el mismo momento en los tres sitios:

- SSO: `FLOWPAY_JWT_SECRET`
- Backend: `FLOWPAY_JWT_SECRET`
- Payments: `FLOWPAY_PAYMENTS_JWT_SECRET` si está definida; si no, `FLOWPAY_JWT_SECRET`

Si uno queda con el valor viejo, el login responde 401.

En producción (`FLOWPAY_ENV=production`, o `PORT` definido como en Railway) los tres procesos no arrancan si el JWT tiene menos de 16 caracteres. En local, si el secreto del backend o de payments está vacío, siguen sin exigir token. El SSO lo exige siempre.

`FLOWPAY_DATA_KEY` es obligatoria en producción (mínimo 32 caracteres). Si falta, el SSO no arranca. En local, si está vacía, el TOTP se sigue derivando del JWT.

Antes de rotar el JWT:

1. Confirmar que backend y payments rechazan un access token cuyo `jti` está en `revoked_access_tokens`. Ya lo hacen, con la copia en memoria descrita arriba.
2. Dejar `FLOWPAY_DATA_KEY` puesta en el SSO y reiniciarlo antes de cambiar el JWT.
3. Generar el valor nuevo fuera del repo (`openssl rand -base64 48` o equivalente).
4. Publicar el mismo valor en los tres servicios y reiniciarlos juntos.
5. Las sesiones abiertas dejan de servir. La gente vuelve a entrar. La lista de `jti` no hace falta para ese corte: lo hace la firma. La lista sirve, ya con el secreto nuevo, para cerrar una sesión sin volver a rotar.

### Twilio

Solo vive en el backend.

- `FLOWPAY_TWILIO_ACCOUNT_SID`
- `FLOWPAY_TWILIO_AUTH_TOKEN`
- `FLOWPAY_TWILIO_WHATSAPP_FROM` y las plantillas, si cambian de número

Para rotar el token: en la consola de Twilio, crear un Auth Token nuevo, ponerlo en `FLOWPAY_TWILIO_AUTH_TOKEN`, reiniciar el backend y comprobar un aviso de WhatsApp. Recién ahí revocar el token viejo en Twilio. El Account SID no se rota; si la cuenta quedó expuesta, se abre otra y se cambian SID, token y remitente juntos.

### Webpay y la clave que cifra las credenciales

La llave de comercio de Webpay no es una variable de entorno. Cada empresa la guarda en `company_payment_credentials` (`webpay_commerce_code` y `webpay_api_key`), cifrada con AES-256-GCM. Lo mismo pasa con Khipu, Fintoc y Oneclick. El API no devuelve el valor, solo si el medio está configurado.

La clave de cifrado es `FLOWPAY_PAYMENT_CREDENTIALS_KEY` (mínimo 32 caracteres). Tiene que ser la misma en backend y en payments. En producción los dos procesos no arrancan si falta. En local, si falta, el panel no guarda credenciales y el enlace no cobra con tarjeta. Para cambiarla:

1. Anotar qué empresas tienen Webpay, Khipu, Fintoc u Oneclick. El panel muestra el estado, no la llave.
2. Pedir a cada empresa la llave nueva, o la actual si solo se rota el cifrado. En Transbank, la llave de Webpay se emite de nuevo en el portal del comercio; código y llave se guardan juntos en el panel.
3. Poner la clave nueva en los dos servicios y reiniciarlos.
4. Volver a guardar cada medio en el panel. Hasta ese momento payments no puede descifrar lo que se selló con la clave vieja y el cobro con tarjeta falla.

No borres la clave vieja del gestor de secretos hasta que esas empresas hayan vuelto a guardar.

## Respaldo de Postgres

Usuarios, empresas y cobros están en la misma base de Supabase (`FLOWPAY_DSN` en backend y SSO, `FLOWPAY_PAYMENTS_DSN` o `FLOWPAY_DSN` en payments). El respaldo no se versiona.

Supabase cifra el disco en reposo. Los respaldos del plan de pago salen cifrados desde ese mismo almacenamiento. Para comprobar que el de este proyecto está programado: en el dashboard, Database → Backups. En el plan Pro hay una copia diaria y se puede agregar PITR. Anotar la hora de la última copia y cuántos días retiene.

La siguiente copia diaria no se pide: la agenda la dispara sola. Una copia extra, fuera de esa agenda, se saca con `pg_dump` usando el `FLOWPAY_DSN` del entorno, desde una máquina de confianza. El archivo no entra al repo ni al chat.

Restaurar en una base vacía, nunca encima de la que está en producción:

1. En Backups, descargar la copia. No usar "Restore" sobre el proyecto que atiende clientes.
2. Crear un proyecto o una base vacíos.
3. Cargar el volcado (`psql` o `pg_restore`, según el formato que entregue Supabase).
4. Comprobar que abren filas de usuarios, de `companies` y de cobros.
5. Anotar aquí la duración y borrar el archivo de la máquina.

Esta pasada no midió una restauración. La copia programada está en el proyecto de Supabase y restaurarla aquí implicaría bajar datos de clientes a esta máquina, o usar "Restore" sobre la base que atiende. Ninguna de las dos cosas se hizo. La duración se anota cuando alguien con acceso al dashboard cargue esa copia en un proyecto vacío y cronometre el paso 3.

## Orígenes del navegador

En local, un origen `http://localhost` o `http://127.0.0.1` puede llamar a los tres API. Con `FLOWPAY_ENV=production` o con `PORT` definido, esos orígenes dejan de estar permitidos. Siguen `https://geldflus.com`, `https://www.geldflus.com`, `https://app.geldflus.com` y lo que liste `FLOWPAY_CORS_ORIGINS`.

## Dependencias

El workflow `Dependencias` corre en los cuatro repos en cada push, en cada pull request y los lunes.

- Front: `npm audit`. Corta el build si queda alguna vulnerabilidad conocida, también en dependencias de desarrollo.
- Backend, SSO y payments: `govulncheck ./...`. Corta si una vulnerabilidad conocida está en código que el servicio sí ejecuta.

Los tres servicios Go quedan en 1.26.10, con `golang.org/x/net` v0.60.0, `golang.org/x/crypto` v0.57.0 y `golang.org/x/text` v0.42.0. Backend y SSO usan jwt v5.3.1 y pgx v5.9.2. Payments usa `quic-go` v0.59.1.

SheetJS (`xlsx`) quedó fuera del front: los avisos altos no tienen parche. La importación de clientes lee `.xlsx` con `read-excel-file` y la plantilla se escribe con `write-excel-file`. Un `.xls` viejo hay que guardarlo como `.xlsx`.

## Prueba de intrusión

El encargo lo hace la empresa, por escrito, a un proveedor externo. Este texto es el alcance para enviarlo. No es un informe y no abre hallazgos: no se ejecutó la prueba.

Alcance, sobre una copia restaurada en una base vacía, nunca sobre los datos que atienden clientes:

- Sitio público, login, recuperación y MFA.
- Panel de cobros, clientes, adjuntos y avisos.
- Enlace público `/pay/{token}`, el salto a Webpay y la vuelta.
- Cabeceras del front, cookie de sesión y revocación del access token.

Fuera de alcance: denegación de servicio, ingeniería social contra personas, y cualquier prueba que modifique o exfiltre datos de clientes reales.

Por cada hallazgo, una tarjeta con título, severidad, URL o petición, qué se observó, impacto y si ya tiene parche. La tarjeta se abre cuando llegue el informe.

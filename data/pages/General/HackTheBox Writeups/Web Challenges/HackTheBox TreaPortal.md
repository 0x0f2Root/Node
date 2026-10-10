---
tags:
  - "Easy"
  - "HackTheBox"
  - "Web"
  - "Web-Challenge"
  - "XPATH Injection"
---

## 1. Entiende cómo funciona la aplicación

Imagina que la web tiene una base de datos con este contenido:

Usuario `test`

Tu cuenta registrada

employee

Usuario `admin`

Cuenta privilegiada que contiene la flag

administrator

Cuando te registras, la aplicación te asigna el rol `employee`. El administrador ya existe y contiene la flag dentro de su registro XML.

La aplicación tiene una ruta para consultar perfiles:

```
GET /api/user?username=test
```

Cuando la consultas, el servidor debería devolverte tus propios datos. Si intentas consultar `admin`, debería bloquearte.

Aquí es donde está el fallo.

## 2. ¿Por qué no funciona cambiar el `role` del JWT?

Un JWT contiene tres partes:

```
header.payload.signature
```

El `payload` puede contener algo como esto:

```
{
  "username": "test",
  "role": "employee"
}
```

Podrías cambiar el texto a `"role": "administrator"`, pero la firma dejaría de coincidir si el servidor verifica correctamente el token.

Por eso, en este challenge, olvídate de modificar el JWT. Tu token válido como empleado es suficiente para explotar otro fallo en la autorización.

## 3. El error de programación que lo cambia todo

El artículo muestra esta comprobación en el servidor:

```
const { username } = req.query as any
const tokenPayload = req.user as IJwtPayload

if (
    typeof username === 'string' &&
    username !== tokenPayload.username
) {
    return res.status(403).send({ err: 'Access denied' })
}
```

Vamos a traducirla a lenguaje normal:

1. Recoge el parámetro `username` de la URL.
2. Comprueba si es un texto normal (`string`).
3. Si es texto y no coincide con el usuario autenticado, devuelve un error 403.
4. Si no es texto, se salta esa comprobación.

El error está en el paso cuatro.

### ¿Qué significa `typeof username === 'string'`?

En JavaScript, una cadena de texto es un `string`:

```
typeof "admin" // "string"
```

Pero un array es un objeto:

```
typeof ["admin", "test"] // "object"
```

El programador solo realiza la comprobación de autorización cuando `username` es un `string`.

Mira qué sucede:

Caso A — parámetro normal

`?username=admin`

Es un string. La comprobación se ejecuta y te bloquea.

Caso B — parámetro repetido

`?username=admin&username=test`

Puede convertirse en un array. La comprobación se omite.

Este fallo se conoce como type confusion o confusión de tipos: el código espera un tipo de dato, pero recibe otro y la lógica de seguridad falla.

## 4. ¿Cómo se transforma el parámetro en una inyección XPath?

Aquí aparece el segundo error. El servicio construye una consulta XPath concatenando directamente el valor de `username`:

```
const node = xpath.select1(
  `//user[username='${username}']`,
  doc as any
)
```

XPath es un lenguaje para buscar elementos dentro de documentos XML. Es parecido a SQL en el sentido de que permite seleccionar registros mediante condiciones.

Una consulta normal sería:

```
//user[username='admin']
```

Esto significa: «Busca un usuario cuyo nombre sea `admin`».

El problema es que la aplicación inserta lo que recibe del usuario directamente dentro de la consulta.

Además, el filtro intenta bloquear caracteres peligrosos:

```
const blacklist = ["'", ";", "or", "and", ")", "(", "/", "doc"];
return blacklist.some(pattern => input.includes(pattern));
```

Pero `includes()` se comporta de forma diferente según el tipo de dato:

```
"admin' or 1=1".includes("'")
// true

["admin", "' or 1=1"].includes("'")
// false
```

En el segundo caso, JavaScript busca un elemento que sea exactamente una comilla simple. No busca comillas dentro de cada elemento del array.

El filtro que debía bloquear la inyección deja de funcionar porque recibe un array en vez de una cadena.

## 5. Cómo se explota en el challenge

El artículo utiliza Burp Suite, concretamente la herramienta Repeater, que permite modificar y reenviar una petición HTTP.

La petición vulnerable tiene dos parámetros `username`:

```
GET /api/user?username=admin&username=%27%20or%201%3D1%20or%20%27 HTTP/1.1
Authorization: Bearer TU_JWT_VALIDO
```

El segundo valor está codificado para URL. Una vez decodificado, contiene:

```
' or 1=1 or '
```

Vamos a ver cómo se transforma.

### Paso 1. La petición HTTP

Envías dos valores para el mismo parámetro.

`username=admin`

`username=' or 1=1 or '`

### Paso 2. JavaScript recibe un array

Con el parser utilizado en el artículo, los valores repetidos se agrupan.

`["admin", "' or 1=1 or '"]`

### Paso 3. Se salta la autorización

El tipo es object, no string. La condición de seguridad no se ejecuta.

`typeof username === 'string'` → `false`

### Paso 4. El array se convierte en texto

Al interpolarlo en la consulta, JavaScript une los elementos con una coma.

`admin,' or 1=1 or '`

### Paso 5. XPath evalúa la condición

La inyección introduce una condición verdadera, haciendo que la consulta pueda coincidir con todos los usuarios.

`1=1` siempre es verdadero.

La consulta resultante, simplificada, se parece a:

```
//user[username='admin,' or 1=1 or '']
```

La expresión exacta depende del parser XPath, pero el efecto descrito en el artículo es que la condición puede evaluarse como verdadera para todos los usuarios.

La función utilizada es `xpath.select1()`, que devuelve el primer nodo coincidente. Como el XML se inicializa con el administrador en primer lugar, devuelve su registro.

## 6. Cómo reproducirlo con Burp Suite

Hazlo únicamente contra la instancia del challenge que tienes autorizada.

1. Inicia sesión con tu usuario registrado.
2. Abre Burp Suite y activa el proxy del navegador.
3. Ve a la sección de consulta de empleados e intenta buscar `admin`.
4. En el historial HTTP de Burp, localiza la petición a `/api/user`.
5. Envíala a Repeater.
6. Modifica la URL para que contenga los dos parámetros repetidos y el payload del artículo:
   ```
   /api/user?username=admin&username=%27%20or%201%3D1%20or%20%27
   ```
7. Conserva tu cabecera `Authorization: Bearer ...` con el JWT válido de tu propia sesión.
8. Pulsa Send y revisa el cuerpo de la respuesta.

Si la vulnerabilidad está presente tal como la describe el artículo, la respuesta incluirá los datos del administrador y el campo `flag`.

## 7. ¿Qué debes aprender de este challenge?

Hay tres conceptos fundamentales:

- JWT: el token autentica tu sesión, pero no es necesario falsificarlo para explotar esta vulnerabilidad.
- Type confusion: repetir un parámetro hace que un valor que normalmente sería una cadena se convierta en un array, y la comprobación de autorización se omite.
- XPath injection: el valor del usuario se inserta directamente en una consulta XML, permitiendo manipular las condiciones de búsqueda.

La solución correcta por parte del desarrollador sería validar el tipo de `username`, rechazar parámetros repetidos o estructuras inesperadas, utilizar consultas XPath parametrizadas cuando sea posible y aplicar una autorización robusta antes de devolver datos sensibles.

Quédate con esta idea: no estás rompiendo el JWT; estás aprovechando que el servidor confía demasiado en el tipo de dato que recibe y construye una consulta XPath con ese dato sin protegerla adecuadamente.

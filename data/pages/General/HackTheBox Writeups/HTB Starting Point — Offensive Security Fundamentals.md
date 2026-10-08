# HTB Starting Point — Offensive Security Fundamentals

> Personal cheatsheet for the fundamentals learned through Hack The Box Starting Point.

This cheatsheet covers the basic concepts and commands used during the **Learn the Basics of Offensive Security** Starting Point path.

The main focus is understanding how to identify exposed services, connect to them, enumerate information, and interact with common network protocols.

---

# 1. Enumeration Fundamentals

Enumeration is one of the most important steps in offensive security.

The basic workflow is:

```text
Target
  |
  v
Port Scanning
  |
  v
Service Identification
  |
  v
Service Enumeration
  |
  v
Vulnerability Discovery
  |
  v
Exploitation
```

Before attacking a service, determine:

* Is the port open?
* What service is running?
* What version is running?
* Can we authenticate?
* Is anonymous access enabled?
* What information can the service disclose?

---

# 2. Telnet

## What is Telnet?

Telnet is a network protocol that allows interactive communication with a remote host.

Default port:

```text
TCP/23
```

Telnet is insecure because communication is normally transmitted in plaintext.

It has largely been replaced by SSH for secure remote administration.

---

## Connect to Telnet

```bash
telnet <IP> 23
```

Example:

```bash
telnet 10.10.10.10 23
```

If the service is available, you may receive:

```text
Trying 10.10.10.10...
Connected to 10.10.10.10.
Escape character is '^]'.
```

---

## Manual Connection

Telnet can also be useful for manually interacting with network services.

```bash
telnet <IP> <PORT>
```

Example:

```bash
telnet 10.10.10.10 80
```

You can then manually send protocol data.

For example:

```http
GET / HTTP/1.1
Host: 10.10.10.10
Connection: close
```

This is useful for understanding how protocols communicate at a lower level.

---

## Telnet Enumeration

Check whether the port is open:

```bash
nmap -p23 <IP>
```

Identify the service:

```bash
nmap -sV -p23 <IP>
```

More detailed enumeration:

```bash
nmap -sC -sV -p23 <IP>
```

---

## Things to Look For

When encountering Telnet:

```text
Banner
Username prompt
Password prompt
Anonymous access
Default credentials
Service version
Command shell
```

The service banner may reveal useful information:

```text
Telnet Server X.X
Linux
Windows
Embedded Device
```

---

# 3. FTP

## What is FTP?

FTP stands for **File Transfer Protocol**.

It is commonly used to transfer files between systems.

Default port:

```text
TCP/21
```

FTP commonly uses:

```text
21  -> Control connection
20  -> Data connection in traditional active mode
```

Modern FTP configurations may use different data ports depending on passive mode.

---

# 4. FTP Enumeration

Start with Nmap:

```bash
nmap -p21 <IP>
```

Identify the service:

```bash
nmap -sV -p21 <IP>
```

Run default scripts:

```bash
nmap -sC -sV -p21 <IP>
```

---

## FTP Nmap Scripts

List available FTP-related scripts:

```bash
ls /usr/share/nmap/scripts/ | grep ftp
```

Common example:

```bash
nmap --script ftp-anon -p21 <IP>
```

This checks for anonymous FTP access.

---

# 5. Anonymous FTP

One of the first things to test when discovering FTP is anonymous access.

Connect:

```bash
ftp <IP>
```

Example:

```bash
ftp 10.10.10.10
```

Try:

```text
Username: anonymous
Password: anonymous
```

Depending on the server, the password may be ignored.

You may also encounter:

```text
Username: anonymous
Password: <blank>
```

---

# 6. FTP Commands

Once connected:

### List files

```ftp
ls
```

or:

```ftp
dir
```

### Change directory

```ftp
cd <directory>
```

### Print working directory

```ftp
pwd
```

### Download a file

```ftp
get file.txt
```

### Upload a file

```ftp
put file.txt
```

### Download multiple files

```ftp
mget *
```

### Create a local directory

```ftp
lcd <directory>
```

### Exit

```ftp
bye
```

or:

```ftp
quit
```

---

# 7. FTP Enumeration Workflow

```text
21/TCP discovered
       |
       v
Identify FTP version
       |
       v
Check anonymous access
       |
       v
List directories
       |
       v
Download interesting files
       |
       v
Analyze downloaded files
       |
       v
Search for credentials / information
```

---

## FTP Checklist

```text
[ ] Port 21 open
[ ] Identify FTP version
[ ] Check anonymous login
[ ] List directories
[ ] Check permissions
[ ] Download interesting files
[ ] Inspect configuration files
[ ] Search for credentials
[ ] Check for sensitive information
```

---

# 8. SMB

## What is SMB?

SMB stands for **Server Message Block**.

It is commonly used for:

* File sharing
* Printer sharing
* Network resources
* Windows administration
* Authentication

Common ports:

```text
TCP/445
TCP/139
```

SMB is particularly important in Windows environments.

---

# 9. SMB Enumeration

Check SMB ports:

```bash
nmap -p139,445 <IP>
```

Identify the service:

```bash
nmap -sV -p139,445 <IP>
```

Run default scripts:

```bash
nmap -sC -sV -p139,445 <IP>
```

---

# 10. SMB Shares

One of the first things to investigate is available shares.

Using `smbclient`:

```bash
smbclient -L //<IP>/ -N
```

Example:

```bash
smbclient -L //10.10.10.10/ -N
```

The `-N` option attempts authentication without providing a password.

Example output:

```text
Sharename       Type      Comment
---------       ----      -------
ADMIN$          Disk      Remote Admin
C$              Disk      Default share
IPC$            IPC       Remote IPC
Public          Disk      Public Share
```

---

# 11. Connect to an SMB Share

```bash
smbclient //<IP>/<SHARE>
```

Example:

```bash
smbclient //10.10.10.10/Public
```

For anonymous access:

```bash
smbclient //10.10.10.10/Public -N
```

---

# 12. SMB Commands

Once connected:

### List files

```text
ls
```

### Change directory

```text
cd <directory>
```

### Download a file

```text
get file.txt
```

### Download multiple files

```text
mget *
```

### Upload a file

```text
put file.txt
```

### Show current directory

```text
pwd
```

### Exit

```text
exit
```

---

# 13. SMB Enumeration with Nmap

Useful scripts:

```bash
nmap --script smb-enum-shares -p445 <IP>
```

Enumerate users:

```bash
nmap --script smb-enum-users -p445 <IP>
```

Check SMB security configuration:

```bash
nmap --script smb-security-mode -p445 <IP>
```

Enumerate SMB protocols:

```bash
nmap --script smb-protocols -p445 <IP>
```

---

# 14. SMB Enumeration Workflow

```text
139/445 discovered
       |
       v
Identify SMB version
       |
       v
Enumerate shares
       |
       v
Check anonymous access
       |
       v
Connect to accessible shares
       |
       v
List files
       |
       v
Download interesting files
       |
       v
Analyze information
```

---

# 15. SMB Checklist

```text
[ ] Port 139 open
[ ] Port 445 open
[ ] Identify SMB version
[ ] Enumerate shares
[ ] Test anonymous access
[ ] Enumerate users
[ ] Check share permissions
[ ] List files
[ ] Download interesting files
[ ] Search for credentials
[ ] Inspect sensitive files
```

---

# 16. Service Enumeration Cheat Sheet

| Service |      Port | First Things to Check            |
| ------- | --------: | -------------------------------- |
| Telnet  |      `23` | Banner, authentication, version  |
| FTP     |      `21` | Version, anonymous access, files |
| SMB     | `139/445` | Shares, anonymous access, users  |

---

# 17. Nmap Quick Reference

### Basic Scan

```bash
nmap <IP>
```

### Scan Specific Ports

```bash
nmap -p23,21,139,445 <IP>
```

### Service Detection

```bash
nmap -sV <IP>
```

### Default Scripts

```bash
nmap -sC <IP>
```

### Service + Scripts

```bash
nmap -sC -sV <IP>
```

### Full Port Scan

```bash
nmap -p- <IP>
```

### Fast Full Port Scan

```bash
nmap -p- --min-rate 5000 <IP>
```

---

# 18. The Enumeration Mindset

When you discover an open port, don't immediately try to exploit it.

Ask:

```text
What is running?
       |
       v
What version?
       |
       v
What does it expose?
       |
       v
Can I connect?
       |
       v
Can I authenticate anonymously?
       |
       v
What information can I retrieve?
       |
       v
Does the information reveal another attack path?
```

The objective is to continuously turn information into additional attack surface.

---

# 19. Common Enumeration Commands

### Check connectivity

```bash
ping <IP>
```

### Check a specific port

```bash
nc -nv <IP> <PORT>
```

### Identify service

```bash
nmap -sV -p<PORT> <IP>
```

### Connect manually

```bash
telnet <IP> <PORT>
```

---

# 20. Practical Workflow

A simple workflow for Starting Point machines:

```text
1. Identify target
       |
       v
2. Scan ports
       |
       v
3. Identify services
       |
       v
4. Enumerate each service
       |
       v
5. Check anonymous/default access
       |
       v
6. Collect information
       |
       v
7. Identify potential vulnerabilities
       |
       v
8. Exploit when appropriate
       |
       v
9. Obtain access
       |
       v
10. Continue enumeration
```

---

# 21. Quick Reference

## Telnet

```bash
nmap -sC -sV -p23 <IP>
telnet <IP> 23
```

## FTP

```bash
nmap -sC -sV -p21 <IP>
nmap --script ftp-anon -p21 <IP>
ftp <IP>
```

Anonymous login:

```text
anonymous
anonymous
```

## SMB

```bash
nmap -sC -sV -p139,445 <IP>
smbclient -L //<IP>/ -N
smbclient //<IP>/<SHARE> -N
```

---

# 22. Key Takeaways

### Telnet

Telnet provides remote interactive access but is insecure because communication is generally unencrypted.

```text
23/TCP
```

### FTP

FTP provides file transfer functionality and should always be checked for anonymous access and exposed files.

```text
21/TCP
```

### SMB

SMB provides network file and resource sharing and is especially important when attacking Windows environments.

```text
139/TCP
445/TCP
```

### The Core Lesson

> **Enumerate before you exploit.**

An open port is only the beginning.

The real objective is to understand what the service exposes, identify weaknesses, and use the information gathered to determine the next step in the attack path.

---

# References

* Hack The Box — Starting Point
* Hack The Box Academy
* Nmap Documentation
* `smbclient` documentation
* FTP documentation
* Telnet documentation

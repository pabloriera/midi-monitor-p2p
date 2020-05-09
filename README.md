

## Install and run peerjs-server
```
npm config set prefix ~/.npm
export PATH=$PATH:~/.npm/bin
npm install peer -g
peerjs --port 9000 --key peerjs --path /myapp 
```

## Create local http server to access midi monitor 
```
cd midi-monitor
python3 -m http.server 8000 --bind 127.0.0.1
```

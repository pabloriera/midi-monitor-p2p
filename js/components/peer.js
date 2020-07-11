var lastPeerId = null;
var peer = null; // own peer object
var conn = null;
var recvIdInput = document.getElementById("receiver-id");
var sender_status = document.getElementById("sender_status");
var receiver_status = document.getElementById("receiver_status");
var connectButton = document.getElementById("connect-button");
var remote_output_send_num = document.getElementById("remote_output_send_num");
var offset_slider = document.getElementById("offset_slider");
document.addEventListener("DOMContentLoaded", function() {
  auto_connect();
});

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const get_id = urlParams.get('id');
const connect_to = urlParams.get('connect');
/**
 * Create the Peer object for our end of the connection.
 *
 * Sets up callbacks that handle any events related to our
 * peer object.
 */
function initialize() {
    // Create own peer object with connection to shared PeerJS server
    var id = null;
    
    if (get_id) id = get_id;

    // peer = new Peer(id, {
    //   host: '127.0.0.1',
    //   port: 9000,
    //   path: '/myapp',
    //   debug: 2
    // });
    var host = '174.138.67.236';
    console.log(host);

    peer = new Peer(id, {
      host: host,
      port: 12341,
      path: '/oceano',
      debug: 2
    });

    peer.on('open', function (id) {
        // Workaround for peer.reconnect deleting previous id
        if (peer.id === null) {
            console.log('Received null id from peer open');
            peer.id = lastPeerId;
        } else {
            lastPeerId = peer.id;
        }

        console.log('My ID: ' + peer.id);
        myid.innerHTML = 'My ID: ' + peer.id;
    });

    peer.on('connection', function (c) {
        // Disallow incoming connections
        if (conn && conn.open) {
            c.on('open', function() {
                c.send("Already connected to another client");
                setTimeout(function() { c.close(); }, 500);
            });
            return;
        }

        conn = c;
        console.log("Connected to: " + conn.peer);
        receiver_status.innerHTML = "Connected";
        received2midi();
    });

    peer.on('disconnected', function () {
        sender_status.innerHTML = "Connection lost. Please reconnect";
        console.log('Connection lost. Please reconnect');

        // Workaround for peer.reconnect deleting previous id
        peer.id = lastPeerId;
        peer._lastServerId = lastPeerId;
        peer.reconnect();
    });
    peer.on('close', function() {
        conn = null;
        sender_status.innerHTML = "Connection destroyed. Please refresh";
        console.log('Connection destroyed');
    });
    peer.on('error', function (err) {
        console.log(err);
        alert('' + err);
    });
};

function auto_connect()
{
    if (connect_to)
    {
      console.log('URL Connect to ' + connect_to);
      recvIdInput.value=connect_to;
      join();
    }
};

/**
 * Create the connection between the two Peers.
 *
 * Sets up callbacks that handle any events related to the
 * connection and data received on it.
 */
function join() {
    // Close old connection
    if (conn) {
        conn.close();
    }

    // Create connection to destination peer specified in the input field
    conn = peer.connect(recvIdInput.value, {
        reliable: false
    });

    conn.on('open', function () {
        sender_status.innerHTML = "Connected to: " + conn.peer;
        console.log("Connected to: " + conn.peer);

        // Check URL params for comamnds that should be sent immediately
        var command = getUrlParam("command");
        if (command)
            conn.send(command);
    });
    // Handle incoming data (messages only since this is the signal sender)

    conn.on('close', function () {
        sender_status.innerHTML = "Connection closed";
    });

    received2midi();
};


/**
 * Triggered once a connection has been achieved.
 * Defines callbacks to handle incoming data and connection events.
 */
function received2midi() {
    conn.on('data', function (data) {
        //  Receives MIDI and resends to first midioutput
        var array = new Uint8Array(data['data']);
        var timestamp =  data['timestamp'];
        list = []; for (i in array){list.push(array[i])}
        var remote_output_send = parseInt(remote_output_send_num.value);
        var offset = parseInt(offset_slider.value);
        console.log('Received',list, timestamp+offset);
        console.log('Resending to midi output', WebMidi.outputs[remote_output_send].name);
        WebMidi.outputs[remote_output_send]._midiOutput.send(list,timestamp+offset);
    });
    // conn.on('close', function () {
    //     receiver_status.innerHTML = "Connection reset Awaiting connection...";
    //     conn = null;
    // });
}

/**
 * Get first "GET style" parameter from href.
 * This enables delivering an initial command upon page load.
 *
 * Would have been easier to use location.hash.
 */
function getUrlParam(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null)
        return null;
    else
        return results[1];
};

// // Send message
function sendMessage(msg) {
    if (conn && conn.open) {
        conn.send(msg);
        // console.log("Sent: " + msg);
    } else {
        console.log('Connection is closed');
    }
};

connectButton.addEventListener('click', join);

// Since all our callbacks are setup, start the process of obtaining an ID
initialize();   
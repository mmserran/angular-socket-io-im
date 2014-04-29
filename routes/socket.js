// Keep track of which names are used so that there are no duplicates
var userNames = (function () {
  var names = {};

  var claim = function (name) {
    if (!name || names[name]) {
      return false;
    } else {
      names[name] = true;
      return true;
    }
  };

  // find the lowest unused "guest" name and claim it
  var getGuestName = function () {
    var name,
      nextUserId = 1;

    do {
      name = 'Guest ' + nextUserId;
      nextUserId += 1;
    } while (!claim(name));

    return name;
  };

  // serialize claimed names as an array
  var get = function () {
    var res = [];
    for (user in names) {
      res.push(user);
    }

    return res;
  };

  var free = function (name) {
    if (names[name]) {
      delete names[name];
    }
  };

  return {
    claim: claim,
    free: free,
    get: get,
    getGuestName: getGuestName
  };
}());

var model = (function () {
  var notes = [];
  var freeId = 0;

  var get = function (obj) {
    return notes;
  };

  var getFreeId = function (obj) {
    return freeId;
  };

  var addNote = function (obj) {
    notes.push(obj);
    freeId = JSON.parse(obj).id;
  };

  var updateNote = function (obj) {
    for (var i = 0; i<notes.length; i++) {

      if (JSON.parse(notes[i]).id 
        == JSON.parse(obj).id) {
        notes[i] = obj;
      }
    }
  };

  var deleteNote = function (obj) {

    note = JSON.parse(notes[obj.id]);
    notes[obj.id] = JSON.stringify({
      title: '@null',
      body: note.body,
      pts: note.pts,
      x: note.x,
      y: note.y,
      id: note.id
    });
  };
  // this maintains the server model


  return {
    get: get,
    addNote: addNote,
    updateNote: updateNote,
    deleteNote: deleteNote,
    getFreeId: getFreeId
  };
}());

// export function for listening to the socket
module.exports = function (socket) {
  var name = userNames.getGuestName();

  // send the new user their name and a list of users
  socket.emit('init', {
    name: name,
    users: userNames.get(),
    notes: model.get(),
    freeId: model.getFreeId()
  });


  setInterval(function () {
    socket.emit('scrum:updateView', {});
  }, 600)

  socket.on('scrum:updateModel', function (data) {
    model.updateNote(JSON.stringify(data));
    socket.broadcast.emit('scrum:updateModel', {
      id: data.id,
      x: data.x,
      y: data.y
    });
  });

  socket.on('scrum:deleteNote', function (data) {
    model.deleteNote(data);
    socket.broadcast.emit('scrum:deleteNote', {
      id: data.id
    });
  });
  
  // broadcast a user's message to other users
  socket.on('scrum:createNote', function (data) {
    model.addNote(JSON.stringify(data));
    socket.broadcast.emit('scrum:createNote', {
      title: data.title,
      body: data.body,
      pts: data.pts,
      x: data.x,
      y: data.y,
      id: data.id
    });
  });

  // tell users to update position of obj
  socket.on('scrum:updateNote', function (data) {
    socket.broadcast.emit('scrum:updateNote', {
      id: data.id
    });
  });


  // notify other clients that a new user has joined
  // note: socket.broadcast.emit sends to all but newly created connection
  //       io.sockets.emit will send to all clients
  socket.broadcast.emit('user:join', {
    name: name
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data) {
    socket.broadcast.emit('send:message', {
      user: name,
      text: data.message
    });
  });

  // validate a user's name change, and broadcast it on success
  socket.on('change:name', function (data, fn) {
    if (userNames.claim(data.name)) {
      var oldName = name;
      userNames.free(oldName);

      name = data.name;
      
      socket.broadcast.emit('change:name', {
        oldName: oldName,
        newName: name
      });

      fn(true);
    } else {
      fn(false);
    }
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    socket.broadcast.emit('user:left', {
      name: name
    });
    userNames.free(name);
  });
};

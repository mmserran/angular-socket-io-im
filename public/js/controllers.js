'use strict';

/* Controllers */

scrumApp.controller('ScrumCtrl', function ($scope, socket) {

  // Socket listeners
  // ================

  socket.on('init', function (data) {
    for (var i = 0; i<data.notes.length; i++) {
      $scope.notes.push(JSON.parse(data.notes[i]));
    }
  });

  socket.on('scrum:updateModel', function (obj) {

    // update the model
    $scope.notes[obj.id-1].x = obj.x;
    $scope.notes[obj.id-1].y = obj.y;

    // animate obj to new position
  /*
    var name = '#n'+obj.id;
    var note = $scope.stage.find(name);
    var tween = new Kinetic.Tween({
      node: note, 
      duration: 3,
      x: 5,
      y: -5,
      easing: Kinetic.Easings.StrongEaseIn,
    }).play();
  */
  });

  socket.on('scrum:updateView', function () {
    if (!$scope.blocking) {
      updateView();
    }
  });

  socket.on('scrum:createNote', function (obj) {

    // add data to model
    $scope.notes.push({
      title: obj.title,
      body: obj.body,
      pts: obj.pts,
      x: obj.x,
      y: obj.y,
      id: obj.id
    });


  });

  socket.on('scrum:deleteNote', function (obj) {

    // add data to model
    $scope.notes[obj.id].title = '@null';

  });


  // Private helpers
  // ===============

  var updateView = function () {
    
    $scope.layer.removeChildren();

    for (var i=0; i<$scope.notes.length; i++) {
      drawNote($scope.notes[i], $scope.layer);
      
    }

  }

  var drawNote = function (obj, layer) {
    var note = new Kinetic.Rect({
      x: obj.x,
      y: obj.y,
      
      width: 100,
      height: 100,
      fill: 'green',
      stroke: 'black',
      strokeWidth: 4,
      draggable: true,
      id: 'n' + obj.id
    });
    note.on('dragstart', function () {
      $scope.blocking = true;
    });
    note.on('dragend', function () {
      var coords = note.getPosition();
      $scope.notes[obj.id-1].x = coords.x;
      $scope.notes[obj.id-1].y = coords.y;
      socket.emit('scrum:updateModel', {
        title: obj.title,
        body: obj.body,
        pts: obj.pts,
        x: coords.x,
        y: coords.y,
        id: obj.id
      });
      $scope.blocking = false;
    });
    $scope.layer.add(note);

    // propagate change to canvas
    $scope.stage.add($scope.layer);

  }

  var indexList = {}
  var avail = function (index) {
    if (!index || indexList[index]) {
      return false;
    } else {
      indexList[index] = true;
      return true;
    }
  }

  // find the lowest unused index and claim it
  var getIndex = function () {
    var index,
      nextId = 1;

    do {
      index = 'n' + nextId;
      nextId += 1;
    } while (!avail(index));

    return nextId-1;
  }

  // Methods published to the scope
  // ==============================
  $scope.blocking = false;
  $scope.notes = [];

  $scope.updateNote = function () {
    var obj = {
      id: 1
    }

    // notify others to update model
    socket.emit('scrum:updateNote', {
      id: obj.id
    }, function (result) {
      ;
    });

    // update our own model
    updateView();

    // draw note to canvas
  };

  $scope.createNote = function () {

    var index = getIndex();
    var blankNote = {
      title: 'Untitled',
      body: '',
      pts: 0,
      x: Math.random() * (1000-100),
      y: Math.random() * (400-100),
      id: index
    };

    // notify others to update model
    socket.emit('scrum:createNote', blankNote, function (result) {
      ;
    });

    // update our own model
    $scope.notes.push(blankNote);

    // draw a temp obj to our canvas
    drawNote(blankNote, {});
  };

  $scope.deleteNote = function () {
    var deadmanID = 1;
    alert('deleting' + deadmanID);
    socket.emit('scrum:deleteNote', {
      id: deadmanID
    })
    $scope.notes[deadmanID].title = '@null';
  }

  $scope.initCanvas = function() {
    var stage = new Kinetic.Stage({
      container: 'scrumCanvas',
      width: 1000,
      height: 400,
    })
    $scope.stage = stage;

    var layer = new Kinetic.Layer();
    $scope.layer = layer;

    $scope.stage.add($scope.layer);
  }



})

chatApp.controller('ChatCtrl', function ($scope, socket) {

  // Socket listeners
  // ================

  socket.on('init', function (data) {
    $scope.name = data.name;
    $scope.users = data.users;
  });

  socket.on('send:message', function (message) {
    $scope.messages.push(message);
  });

  socket.on('change:name', function (data) {
    changeName(data.oldName, data.newName);
  });

  socket.on('user:join', function (data) {
    $scope.messages.push({
      user: '.',
      text: 'User ' + data.name + ' has joined.'
    });
    $scope.users.push(data.name);
  });

  // add a message to the conversation when a user disconnects or leaves the room
  socket.on('user:left', function (data) {
    $scope.messages.push({
      user: '.',
      text: 'User ' + data.name + ' has left.'
    });
    var i, user;
    for (i = 0; i < $scope.users.length; i++) {
      user = $scope.users[i];
      if (user === data.name) {
        $scope.users.splice(i, 1);
        break;
      }
    }
  });

  // Private helpers
  // ===============

  var changeName = function (oldName, newName) {
    // rename user in list of users
    var i;
    for (i = 0; i < $scope.users.length; i++) {
      if ($scope.users[i] === oldName) {
        $scope.users[i] = newName;
      }
    }

    $scope.messages.push({
      user: '.',
      text: 'User ' + oldName + ' is now known as ' + newName + '.'
    });
  }

  // Methods published to the scope
  // ==============================

  $scope.changeName = function () {
    socket.emit('change:name', {
      name: $scope.newName
    }, function (result) {
      if (!result) {
        alert('There was an error changing your name');
      } else {
        
        changeName($scope.name, $scope.newName);

        $scope.name = $scope.newName;
        $scope.newName = '';
      }
    });
  };

  $scope.messages = [];

  $scope.sendMessage = function () {
    socket.emit('send:message', {
      message: $scope.message
    });

    // add the message to our model locally
    $scope.messages.push({
      user: $scope.name,
      text: $scope.message
    });

    // clear message box
    $scope.message = '';
  };
});

'use strict';

/* Controllers */

scrumApp.controller('ScrumCtrl', function ($scope, socket) {

  // Socket listeners
  // ================

  socket.on('scrum:updateNote', function (newInfo) {
    updateView();

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



  // Private helpers
  // ===============

  var updateView = function () {
    
    var msg = '';
    for (var i=0; i<$scope.notes.length; i++) {
      drawNote($scope.notes[i], $scope.layer);
    }

  }

  var drawNote = function (obj, layer) {
    var node = new Kinetic.Rect({
      x: obj.x,
      y: obj.y,
      
      width: 100,
      height: 100,
      fill: 'green',
      stroke: 'black',
      strokeWidth: 4,
      draggable: true
    });


    $scope.layer.add(node);

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
  };

  $scope.initCanvas = function() {
    var stage = new Kinetic.Stage({
      container: 'scrumCanvas',
      width: 1000,
      height: 400,
    })
    $scope.stage = stage;

    var layer = new Kinetic.Layer();
    layer.clearBeforeDraw = true;

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

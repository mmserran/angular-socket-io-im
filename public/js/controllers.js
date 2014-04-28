'use strict';

/* Controllers */

scrumApp.controller('ScrumCtrl', function ($scope, socket) {

  // Socket listeners
  // ================



  // Private helpers
  // ===============

  function newNote(obj, layer) {
    // add data to model
    $scope.notes.push({
      title: 'Untitled',
      body: '',
      pts: 0,
      x: 6,
      y: 6
    })

    // propagte change to canvas
    var node = new Kinetic.Rect({
      x: Math.random()*(1000-100),
      y: Math.random()*(400-100),
      
      width: 100,
      height: 100,
      fill: 'green',
      stroke: 'black',
      strokeWidth: 4,
      draggable: true
    });

    layer.add(node);
  }

  function drawModelToCanvas() {
    // build data
    // for note in notes, add note to layer

    // render data
    // add the layer to the stage
    $scope.stage.add($scope.layer);
  }


  // Methods published to the scope
  // ==============================

  $scope.notes = [];

/*

*/
  $scope.initCanvas = function() {
    var stage = new Kinetic.Stage({
      container: 'scrumCanvas',
      width: 1000,
      height: 400,
    })
    $scope.stage = stage;

    var layer = new Kinetic.Layer();
    $scope.layer = layer;

    drawModelToCanvas();
  }


})

chatApp.controller('ChatCtrl', function ($scope, socket) {

  // Socket listeners
  // ================

  socket.on('scrum:addNote', function() {
    alert('received Note!!');
  })

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

  $scope.addNote = function () {
    alert('addNote before');
    var blankNote = {
      title: 'Untitled',
      body: '',
      pts: 0,
      x: 6,
      y: 6
    }

    socket.emit('scrum:addNote', blankNote);

    // manipulate the model
    //newNote(blankNote, $scope.layer);

    // update the view (canvas)
    //drawModelToCanvas();
    alert('addNote after');
  }

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

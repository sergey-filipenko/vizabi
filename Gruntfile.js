var path = require('path');

module.exports = function (grunt) {

  // TODO: rewrite it with gulp (we want it faster and faster)
  require('load-grunt-config')(grunt, {
    configPath: path.join(process.cwd(), '/grunt/config'),
    loadGruntTasks: {
      config: require('./package.json'),
      scope: 'devDependencies',
      pattern: [
        'grunt-*',
        '@*/grunt-*',
        'jit-grunt'
      ]
    },
    jitGrunt: {
      customTasksDir: 'grunt/tasks'
    }
  });
};

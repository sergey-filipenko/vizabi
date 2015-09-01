//replace is used to adjust paths on test files

module.exports = function(grunt) {

    var app = grunt.option('app') || "bubblechart";

    return {
        options: {
            platforms: ['osx64' /*, 'win32', 'win64'*/]
        },
        src: ['.tmp/' + app + '/**/*'] // Your NW.js app
    };

}
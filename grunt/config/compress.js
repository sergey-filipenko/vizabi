//replace is used to adjust paths on test files

module.exports = function(grunt) {

    var app = grunt.option('app') || "bubblechart";

    return {
        main: {
            options: {
                archive: app + '.zip'
            },
            files: [{
                expand: true,
                src: ['preview/**/*'],
                dest: '/'
            }]
        }
    }

}
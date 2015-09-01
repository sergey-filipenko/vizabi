//replace is used to adjust paths on test files

module.exports = function(grunt) {

    var app = grunt.option('app') || "bubblechart";

    return {
        test: {
            options: {
                patterns: [{
                    match: /.grunt\/grunt-contrib-jasmine\//g,
                    replacement: 'test/jasmine/'
                }, {
                    match: /spec\//g,
                    replacement: 'test/spec/'
                }, {
                    match: /preview\//g,
                    replacement: ''
                }, {
                    match: /dist\//g,
                    replacement: '../dist/'
                }, {
                    match: /lib\/d3\//g,
                    replacement: 'assets/js/'
                }]
            },
            files: [{
                expand: true,
                flatten: true,
                src: ['test.html'],
                dest: 'preview/'
            }]
        },
        app: {
            options: {
                patterns: [{
                    match: /%APP_NAME%/g,
                    replacement: app
                }]
            },
            files: [{
                expand: true,
                flatten: true,
                src: ['preview_src/package.json'],
                dest: 'preview/'
            }]
        }
    };

}
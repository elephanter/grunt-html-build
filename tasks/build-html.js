/*
 * grunt-html-build
 * https://github.com/spatools/grunt-html-build
 * Copyright (c) 2013 SPA Tools
 * Code below is licensed under MIT License
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
 * ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

module.exports = function (grunt) {
    //#region Global Properties

    var _ = grunt.util._,
        EOL = grunt.util.linefeed,
        blockRegex =  /([\s]*<!--\s*build:\s*(html)\s*(\S*)\s*-->)(\n|\r|.)*?(<!--\s*endbuild\s*-->)/gi,
        injectRegex =  /([\s]*<!--\s*inject:\s*(\S*)\s*(\S*)\s*-->)(\n|\r|.)*?(<!--\s*endinject\s*-->)/gi;

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function replaceIncludes(filePath, pluginFiles){
        return function(match, startBlock, type, tag, innerText, endOfBlock, offset, string ){
            var fileSuffix = tag.replace(/\./g, "/") + "."+type
            grunt.log.writeln("Processing tag "+tag+" with type "+type);

            var replaceStrings = _.reduce(pluginFiles, function(memo, f){
                if (endsWith(f, fileSuffix)){
                    grunt.log.writeln("Appending file "+ f);
                    memo.push(grunt.file.read(f).toString());
                }
                return memo;
            }, [])

            if (replaceStrings.length == 0) { // do not replace, if nothing to replace with
                replaceStrings.push(match)
            }
                
            return replaceStrings.join(EOL);
        }
    }
    function replaceInjects(filePath, injectFiles, modifyFunc, params){
        return function(match, startBlock, type, tag, innerText, endOfBlock, offset, string ){
            return _.reduce(injectFiles, function(memo, f){
                memo.push(
                    modifyFunc(grunt.file.read(params.cwd+f).toString(), f)
                );
                return memo;
            }, []).join(EOL);
        }
    }

    grunt.registerMultiTask('htmlbuild', "Grunt HTML Plugin injector - Replace comment tag with all plugin's partials", function () {
        var params = this.options({
            pluginFiles: [],
            injectFiles: [],
            modifyFunc: function(content, file){ return content;},
            cwd: "",
            scripts: {},
            styles: {},
            sections: {},
            data: {}
        });

        var pluginFiles = grunt.file.expand(params.pluginFiles);
        var injectFiles = grunt.file.expand({ filter: 'isFile', cwd: params.cwd}, params.injectFiles);
        console.log(injectFiles);

        this.files.forEach(function (file) {
            file.src.forEach(function (src) {
                //grunt.log.writeln("Processing " + src);
                var content = grunt.file.read(src);
                var newContents = content;
                if (pluginFiles.length>0){
                    newContents = newContents.replace(
                        blockRegex,
                        replaceIncludes(src, pluginFiles)
                    );
                }
                if (injectFiles.length>0){
                    newContents = newContents.replace(
                        injectRegex,
                        replaceInjects(src, injectFiles, params.modifyFunc, params)
                    );
                }
                if (content !== newContents){
                    grunt.file.write(src, newContents);
                    grunt.log.ok("File " + src + " modified!");
                }
            });
        });
    });
};

/* globals FormData, Promise, Vue */
// define
var FileUploadComponent = Vue.extend({
  template: '#file-upload',
  props: ['name', 'action', 'accept', 'multiple'],
  data: function() {
    return {
      myFiles: [] // a container for the files in our field
    };
  },
  methods: {
    fileInputClick: function() {
      // click actually triggers after the file dialog opens
      this.$dispatch('onFileClick', this.myFiles);
    },
    fileInputChange: function() {
      // get the group of files assigned to this field
      this.myFiles = document.getElementById(this.name).files;
      this.$dispatch('onFileChange', this.myFiles);
    },
    _onProgress: function(e) {
      // this is an internal call in XHR to update the progress
      e.percent = (e.loaded / e.total) * 100;
      this.$dispatch('onFileProgress', e);
    },
    _handleUpload: function(file) {
      this.$dispatch('beforeFileUpload', file);
      var form = new FormData();
      var xhr = new XMLHttpRequest();
      try {
        form.append('Content-Type', file.type || 'application/octet-stream');
        // our request will have the file in the ['file'] key
        form.append('file', file);
      } catch (err) {
        this.$dispatch('onFileError', file, err);
        return;
      }

      return new Promise(function(resolve, reject) {

        xhr.upload.addEventListener('progress', this._onProgress, false);

        xhr.onreadystatechange = function() {
          if (xhr.readyState < 4) {
            return;
          }
          if (xhr.status < 400) {
            var res = JSON.parse(xhr.responseText);
            this.$dispatch('onFileUpload', file, res);
            resolve(file);
          } else {
            var err = new Error(xhr.responseText);
            err.status = xhr.status;
            err.statusText = xhr.statusText;
            this.$dispatch('onFileError', file, err);
            reject(err);
          }
        }.bind(this);

        xhr.onerror = function() {
          var err = new Error(xhr.responseText);
          err.status = xhr.status;
          err.statusText = xhr.statusText;
          this.$dispatch('onFileError', file, err);
          reject(err);
        }.bind(this);

        xhr.open('POST', this.action, true);
        xhr.send(form);
        this.$dispatch('afterFileUpload', file);
      }.bind(this));
    },
    fileUpload: function() {
      if(this.myFiles.length > 0) {
        // a hack to push all the Promises into a new array
        var arrayOfPromises = Array.prototype.slice.call(this.myFiles, 0).map(function(file) {
          return this._handleUpload(file);
        }.bind(this));
        // wait for everything to finish
        Promise.all(arrayOfPromises).then(function(allFiles) {
          this.$dispatch('onAllFilesUploaded', allFiles);
        }.bind(this)).catch(function(err) {
          this.$dispatch('onFileError', this.myFiles, err);
        }.bind(this));
      } else {
        // someone tried to upload without adding files
        var err = new Error("No files to upload for this field");
        this.$dispatch('onFileError', this.myFiles, err);
      }
    }
  }
});

// register
Vue.component('file-upload', FileUploadComponent);
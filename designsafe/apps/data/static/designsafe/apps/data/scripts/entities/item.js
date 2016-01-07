(function(window, angular, $) {
    "use strict";
    angular.module('FileManagerApp').factory('item', ['$http', '$q', '$translate', 'fileManagerConfig', 'chmod', function($http, $q, $translate, fileManagerConfig, Chmod) {

        var Item = function(model, path) {
            var rawModel = {
                name: model && model.name || '',
                path: path || [],
                agavePath: model && model.agavePath || '',
                type: model && model.type || 'file',
                size: model && parseInt(model.size || 0),
                // date: parseMySQLDate(model && model.date),
                date: model && model.date,
                // perms: new Chmod(model && model.rights),
                perms: {},
                content: model && model.content || '',
                recursive: false,
                sizeKb: function() {
                    // return Math.round(this.size / 1024, 1);
                    if (isNaN(this.size)){
                        return '- ';
                    }else{
                      return (this.size / 1024).toFixed(1);
                    }
                },
                fullPath: function() {
                    return ('/' + this.path.join('/') + '/' + this.name).replace(/\/\//, '/');
                }
            };

            this.error = '';
            this.inprocess = false;

            this.model = angular.copy(rawModel);
            this.tempModel = angular.copy(rawModel);

            function parseMySQLDate(mysqlDate) {
                var d = (mysqlDate || '').toString().split(/[- :]/);
                return new Date(d[0], d[1] - 1, d[2], d[3], d[4], d[5]);
            }
        };

        Item.prototype.update = function() {
            angular.extend(this.model, angular.copy(this.tempModel));
        };

        Item.prototype.revert = function() {
            angular.extend(this.tempModel, angular.copy(this.model));
            this.error = '';
        };

        Item.prototype.deferredHandler = function(data, deferred, defaultMsg) {
            if (!data || typeof data !== 'object') {
                this.error = 'Bridge response error, please check the docs';
            }
            if (data.result && data.result.error) {
                this.error = data.result.error;
            }
            if (!this.error && data.error) {
                this.error = data.error.message;
            }
            if (!this.error && defaultMsg) {
                this.error = defaultMsg;
            }
            if (this.error) {
                return deferred.reject(data);
            }
            this.update();
            return deferred.resolve(data);
        };

        Item.prototype.createFolder = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: "addfolder",
                path: self.tempModel.path.join('/'),
                name: self.tempModel.name
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.createFolderUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_creating_folder'));
            })['finally'](function(data) {
                self.inprocess = false;
            });

            return deferred.promise;
        };

        Item.prototype.rename = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                "mode": "rename",
                "path": self.model.fullPath(),
                "newPath": self.tempModel.fullPath()
            }};
            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.renameUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_renaming'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.copy = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: "copy",
                path: self.model.fullPath(),
                newPath: self.tempModel.fullPath()
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.copyUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_copying'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.compress = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: "compress",
                path: self.model.fullPath(),
                destination: self.tempModel.fullPath()
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.compressUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_compressing'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.extract = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: "extract",
                path: self.model.fullPath(),
                sourceFile: self.model.fullPath(),
                destination: self.tempModel.fullPath()
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.extractUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_extracting'));
            })["finally"](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.download = function(preview) {
            var self = this;
            var deferred = $q.defer();
            var path = self.model.fullPath();
            var url = fileManagerConfig.downloadFileUrl + path;

            self.requesting = true;
            $http(
              {
                method: 'GET',
                url: url
              }
            ).success(function(data) {
                if (angular.isObject(data)) {
                    saveAs(new Blob([JSON.stringify(data, null, 2)]),self.model.name);
                } else {
                    saveAs(new Blob([data]),self.model.name);
                }
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'Unknown error downloading file');
            })['finally'](function(data) {
                self.requesting = false;
            });

            return deferred.promise;
        };

        Item.prototype.preview = function() {
            var self = this;
            return self.download(true);
        };

        Item.prototype.getContent = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: "editfile",
                path: self.tempModel.fullPath()
            }};

            self.inprocess = true;
            self.error = '';
            $http.post(fileManagerConfig.getContentUrl, data).success(function(data) {
                self.tempModel.content = self.model.content = data.result;
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_getting_content'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.remove = function() {
            var self = this;
            var deferred = $q.defer();
            var path = self.model.fullPath();
            var url = fileManagerConfig.tenantUrl + fileManagerConfig.removeUrl  + fileManagerConfig.user + path;

            self.requesting = true;
            $http(
              {
                method: 'DELETE',
                url: url,
                headers: {
                  'Authorization': 'Bearer ' +  fileManagerConfig.token,
                }
              }
            ).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, 'Unknown error removing file');
            })['finally'](function(data) {
                self.requesting = false;
            });

            return deferred.promise;
        };

        Item.prototype.edit = function() {
            var self = this;
            var deferred = $q.defer();
            var data = {params: {
                mode: "savefile",
                content: self.tempModel.content,
                path: self.tempModel.fullPath()
            }};

            self.inprocess = true;
            self.error = '';

            $http.post(fileManagerConfig.editUrl, data).success(function(data) {
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('error_modifying'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.getPermissions = function() {
          var self = this;
          var deferred = $q.defer();
          var path = self.model.fullPath();
          var url = fileManagerConfig.tenantUrl + fileManagerConfig.permissionsUrl  + fileManagerConfig.user + path;

          self.error = '';
          self.requesting = true;

          $http(
            {
              method: 'GET',
              url: url,
              headers: {
                'Authorization': 'Bearer ' +  fileManagerConfig.token,
              }
            }
          ).success(function(data) {
              _.each(data.result, function(user){
                self.tempModel.perms[user.username] = user.permission;
                self.requesting = false;
              });
              self.deferredHandler(data, deferred);
          }).error(function(data) {
              self.deferredHandler(data, deferred, 'Unknown error downloading file');
          });

          return deferred.promise;
        };

        Item.prototype.changePermissions = function() {

            var self = this;
            var path = self.model.fullPath();

            var deferred = $q.defer();

            self.error = '';

            self.requesting = true;

            _.each(self.model.perms, function(value, key){
              if (!_.isEqual(self.model.perms[key], self.tempModel.perms[key])){
                var url = fileManagerConfig.tenantUrl + fileManagerConfig.permissionsUrl  + fileManagerConfig.user + path;
                var permission;

                if (self.tempModel.perms[key].read === true){
                  permission = 'READ';
                }
                if (self.tempModel.perms[key].write === true){
                  permission = 'WRITE';
                }
                if (self.tempModel.perms[key].execute === true){
                  permission = 'EXECUTE';
                }
                if (self.tempModel.perms[key].read === true && self.tempModel.perms[key].write === true){
                  permission = 'READ_WRITE';
                }
                if (self.tempModel.perms[key].read === true && self.tempModel.perms[key].execute === true){
                  permission = 'READ_EXECUTE';
                }
                if (self.tempModel.perms[key].write === true && self.tempModel.perms[key].execute === true){
                  permission = 'WRITE_EXECUTE';
                }
                if (self.tempModel.perms[key].read === true && self.tempModel.perms[key].write === true && self.tempModel.perms[key].execute === true){
                  permission = 'ALL';
                }

                var body = {
                  username: key,
                  permission: permission,
                  recursive: false
                };

                $http(
                  {
                    method: 'POST',
                    url: url,
                    data: body,
                    headers: {
                      'Authorization': 'Bearer ' +  fileManagerConfig.token,
                    }
                  }
                ).success(function(data) {
                    _.each(data.result, function(user){
                      self.tempModel.perms[user.username] = user.permission;
                      self.requesting = false;
                    });
                    self.deferredHandler(data, deferred);
                    self.requesting = false;
                }).error(function(data) {
                    // reset permissions to Original
                    self.tempModel.perms[key] = self.model.perms[key];
                    self.requesting = false;
                    self.error = data.message;
                    self.deferredHandler(data, deferred, 'Unknown error downloading file');
                });

              }
            });
            return deferred.promise;
        };

        /*******************************
            Adding new things like metadata
        *******************************/
        Item.prototype.showMetadata = function(){
            var self = this;
            var deferred = $q.defer();
            var path = self.model.fullPath();
            self.inprocess = true;
            self.error = '';
            $http.get(fileManagerConfig.metadataUrl + path).success(function(data) {
                var md = data[0];
                self.tempModel.metadata = md;
                self.tempModel.metaForm = md;
                self.tempModel.metaForm.value.author = md && md.value.author || '';
                self.tempModel.metaForm.value.project = md && md.value.project || '';
                self.tempModel.metaForm.value.source = md && md.value.source || '';
                self.tempModel.metaForm.value.key = md && md.value.key || '';
                self.deferredHandler(data, deferred);
            }).error(function(data) {
                self.deferredHandler(data, deferred, $translate.instant('Error getting Metadata info.'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.updateMetadata = function(){
            var self = this;
            var deferred = $q.defer();
            var path = self.model.fullPath();
            self.inprocess = true;
            self.error = '';
            var data = {
                "metadata": self.tempModel.metaForm
            };
            $http.post(fileManagerConfig.metadataUrl + path,data)
            .success(function(data){
                self.deferredHandler(data, deferred);
            })
            .error(function(data){
                self.deferredHandler(data, deferred, $translate.instant('Error saving metadata.'));
            })['finally'](function(){
                self.inprocess = false;
            });
            return deferred.promise;
        };

        Item.prototype.isFolder = function() {
            return this.model.type === 'dir';
        };

        Item.prototype.isEditable = function() {
            return !this.isFolder() && fileManagerConfig.isEditableFilePattern.test(this.model.name);
        };

        Item.prototype.isImage = function() {
            return fileManagerConfig.isImageFilePattern.test(this.model.name);
        };

        Item.prototype.isCompressible = function() {
            return this.isFolder();
        };

        Item.prototype.isExtractable = function() {
            return !this.isFolder() && fileManagerConfig.isExtractableFilePattern.test(this.model.name);
        };

        return Item;
    }]);
})(window, angular, jQuery);

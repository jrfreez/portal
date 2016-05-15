(function(window, angular, $, _) {
  "use strict";

  var module = angular.module('ng.designsafe');

  module.directive('dsDataBrowser', ['Logging', function(Logging) {
    var logger = Logging.getLogger('ngDesignSafe.dsDataBrowser');

    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser.html',
      scope: {
        data: '=data',  /* the data to initialize the data browser with; available keys are ['listing', 'resource', 'fileId'] */
        onPathChanged: '&onPathChanged',
        onResourceChanged: '&onResourceChanged'
        
      },
      controller: ['$scope', '$uibModal', 'DataService', function($scope, $uibModal, DataService) {
        
        $scope.state = {
          loading: false,
          selecting: false,
          selected: {},
          hover: {}
        };

        var self = this;

        self.getIconClass = function(file, hover) {
          if ($scope.state.selecting || hover) {
            if ($scope.state.selected[file.id]) {
              return 'fa-check-circle';
            } else {
              return 'fa-circle-o';
            }
          }
          return DataService.getIcon(file.type, file.ext);
        };

        self.selectAll = function() {
          if ($scope.state.selectAll) {
            self.clearSelection();
          } else {
            $scope.state.selected = _.chain($scope.data.listing.children)
              .pluck('id').map(function (id) { return [id, true]; })
              .object()
              .value();
            $scope.state.selectAll = $scope.state.selecting = true;
          }
        };

        self.selectFile = function(file) {
          if ($scope.state.selected[file.id]) {
            delete $scope.state.selected[file.id];
          } else {
            $scope.state.selected[file.id] = true;
          }

          if (Object.keys($scope.state.selected).length === 0) {
            self.clearSelection();
          } else {
            $scope.state.selecting = true;
            $scope.state.selectAll = false;
          }
        };

        self.clearSelection = function() {
          $scope.state.selected = {};
          $scope.state.selectAll = $scope.state.selecting = false;
        };

        self.createFolder = function() {
          var instance = $uibModal.open({
            templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-create-folder.html',
            controller: ['$scope', '$uibModalInstance', 'DataService', function($scope, $uibModalInstance) {
              $scope.form = {
                folderName: 'Untitled_folder'
              };

              $scope.doCreateFolder = function($event) {
                $event.preventDefault();
                $uibModalInstance.close($scope.form.folderName);
              };

              $scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
              };
            }]
          });

          instance.result.then(function(folderName) {
            $scope.state.loading = true;
            DataService.mkdir({
              file_id: $scope.data.listing.id,
              resource: $scope.data.listing.source,
              dir_name: folderName
            }).then(function(resp) {
              $scope.data.listing.children.push(resp.data);
              $scope.state.loading = false;
            }, function(err) {
              // TODO notify user mkdir errored
              logger.error(err);
              $scope.state.loading = false;
            })
          });
        };

        self.uploadFiles = function() {};
        
        self.previewFile = function(file) {
          $uibModal.open({
            templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-preview.html',
            controller: function($scope, $sce, $uibModalInstance, DataService, file) {
              $scope.data = {
                file: file
              };

              $scope.data.previewUrl = {loading: true};
              DataService.preview({resource: file.source, file_id: file.id}).then(
                function(resp) {
                  $scope.data.previewUrl.loading = false;
                  if (resp.data) {
                    $scope.data.previewUrl.href = $sce.trustAs('resourceUrl', resp.data.href);
                  } else {
                    $scope.data.previewUrl.href = false;
                  }
                },
                function() {
                  $scope.data.previewUrl.loading = false;
                  $scope.data.previewUrl.href = false;
                });

              $scope.data.downloadUrl = {loading: true};
              DataService.download({resource: file.source, file_id: file.id}).then(
                function(resp) {
                  $scope.data.downloadUrl.loading = false;
                  if (resp.data) {
                    $scope.data.downloadUrl.href = $sce.trustAs('resourceUrl', resp.data.href);
                  } else {
                    $scope.data.downloadUrl.href = false;
                  }
                },
                function() {
                  $scope.data.downloadUrl.loading = false;
                  $scope.data.downloadUrl.href = false;
                });

              // $scope.copyToMyData = function($event, item) {
              //   $event.preventDefault();
              //
              //   DataService.copyToMyData(item)
              //   .then(function(response) {
              //     logger.debug(response);
              //   }, function(error) {
              //     logger.error(error);
              //   });
              // };

              $scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
              };
            },
            size: 'lg',
            resolve: {file: file}
          });
        };

        self.browseFile = function(options) {
          $scope.state.loading = true;
          options = options || {};
          DataService.listPath(options).then(
            function(response) {
              $scope.state.loading = false;
              $scope.data.listing = response.data;

              var handler = $scope.onPathChanged();
              if (handler) {
                handler($scope.data.listing);
              }
            },
            function(error) {
              $scope.state.loading = false;
              logger.error(error);
              // TODO notify user
            }
          );
        };

        if (! $scope.data.listing) {
          self.browseFile();
        }
      }]
    };
  }]);

  module.directive('dsDataBrowserNew', ['Logging', function(Logging) {

    var logger = Logging.getLogger('ngDesignSafe.daDataBrowserNew');

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-new.html',
      scope: {},
      link: function(scope, element, attrs, dbCtrl) {
        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;

        scope.newFileEnabled = function() {
          return _.contains(scope.data.currentSource._actions, 'WRITE') ||
            _.contains(scope.data.listing._actions, 'WRITE');
        };

        scope.createFolder = dbCtrl.createFolder;
        scope.uploadFiles = dbCtrl.uploadFiles;
      }
    };
  }]);

  module.directive('dsDataBrowserSourceSelect', ['Logging', function(Logging) {

    var logger = Logging.getLogger('ngDesignSafe.dsDataBrowserSourceSelect');

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-source-select.html',
      scope: {},
      link: function(scope, element, attrs, dbCtrl) {
        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;

        scope.getSourcePath = function (source) {
          return _.compact([source.resource, source.defaultPath]).join('/') + '/';
        };

        scope.selectSource = function($event, source) {
          $event.preventDefault();
          scope.data.currentSource = source;
          dbCtrl.browseFile({resource: source.resource, file_id: source.defaultPath});
        };
      }
    };
  }]);

  module.directive('dsDataBrowserToolbar', ['Logging', 'DataService', function(Logging, DataService) {

    var logger = Logging.getLogger('ngDesignSafe.dsDataBrowserToolbar');

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-toolbar.html',
      scope: {},
      link: function(scope, element, attrs, dbCtrl) {
        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;
        scope.clearSelection = dbCtrl.clearSelection;
        
        scope.selectTrail = function($event, trailItem) {
          $event.preventDefault();
          dbCtrl.browseFile({resource: trailItem.source, file_id: trailItem.id});
        };

        scope.trashSelected = function() {
          _.each(scope.state.selected, function(val, key) {
            var file = _.findWhere(scope.data.listing.children, {id: key});
            var fileEl = $('tr[data-file-id="' + file.id + '"]');
            fileEl.addClass('ds-data-browser-processing');
            DataService.trash({file_id: file.id, resource: file.source}).then(
              function(resp) {
                scope.data.listing.children = _.reject(scope.data.listing.children, function(file) {
                  return file.id === key;
                });
              },
              function(err) {
                // TODO notify user
                logger.error(err);
                fileEl.addClass('ds-data-browser-processing-danger');
                setTimeout(function() {
                  fileEl.removeClass('ds-data-browser-processing ds-data-browser-processing-danger');
                }, 3000);
              }
            );

          });
        };
      }
    };
  }]);

  module.directive('dsDataListDisplay', ['Logging', 'DataService', function(Logging, DataService) {
    
    var logger = Logging.getLogger('ngDesignSafe.dsDataListDisplay');

    function updateDragEl(options) {
      options = _.extend({dragging: false, action: 'move', icon: 'arrows'}, options);

      var action = options.action;
      var $el = $('.ds-drag-el');
      if ($el.length === 0) {
        $el = $('<div class="ds-drag-el">');
        $el.html('<div class="drag-action"></div><div class="drag-info"></div>');
        $el.appendTo('body');
      }

      $('.drag-action', $el).html('<i class="fa fa-' + options.icon + '"></i> ' + options.action);
      if (options.dragInfo) {
        $('.drag-info', $el).html(options.dragInfo);
      }

      if (options.dragging) {
        $el.show();
      } else {
        $el.hide();
      }
      return $el[0];
    }

    return {
      require: '^^dsDataBrowser',
      restrict: 'E',
      replace: true,
      templateUrl: '/static/scripts/ng-designsafe/html/directives/data-browser-list-display.html',
      scope: {
        enablePreview: '=preview'
      },
      link: function(scope, element, attrs, dbCtrl) {

        scope.state = scope.$parent.$parent.state;
        scope.data = scope.$parent.$parent.data;
        scope.getIconClass = dbCtrl.getIconClass;
        scope.selectAll = dbCtrl.selectAll;
        scope.selectFile = dbCtrl.selectFile;
        scope.clearSelection = dbCtrl.clearSelection;

        scope.browseFile = function($event, file) {
          $event.preventDefault();
          if (file.type === 'folder') {
            dbCtrl.browseFile({resource: file.source, file_id: file.id});
          } else if (scope.enablePreview) {
            dbCtrl.previewFile(file);
          }
        };

        scope.dragStart = function (e, file) {
          var dragInfo = '<i class="fa ' + DataService.getIcon(file.type, file.ext) + '"></i> ' + file.name;
          var effect = e.altKey ? 'copy' : 'move';
          var dragEl = updateDragEl({
            dragging: true,
            icon: effect === 'move' ? 'arrows' : 'copy',
            action: effect,
            dragInfo: dragInfo});

          var fileURI = file.source + '://' + file.id;
          e.dataTransfer.setDragImage(dragEl, 50, 50);
          e.dataTransfer.effectAllowed = effect;
          e.dataTransfer.setData('text/json', JSON.stringify(file));
          e.dataTransfer.setData('text/uri-list', fileURI);
          e.dataTransfer.setData('text/plain', fileURI);
        };
        
        scope.dragEnter = function(e, file) {
          if (file.type === 'folder') {
            $(e.target, element).closest('tr').addClass('ds-droppable');
          }
        };
        
        scope.dragLeave = function(e, file) {
          $(e.target, element).closest('tr').removeClass('ds-droppable');
        };

        scope.dragOver = function(e, file) {
          if (file.type === 'folder') {
            $(e.target, element).closest('tr').addClass('ds-droppable');
            e.preventDefault();
          }
        };

        scope.dragEnd = function() {
          updateDragEl();
        };

        scope.dragDrop = function(e, file) {
          var data = JSON.parse(e.dataTransfer.getData('text/json'));
          var source =  data.id;
          var dest = file.id;
          var dragAction;
          var sourceEl;

          if (source !== dest) {
            dragAction = e.dataTransfer.effectAllowed;
            sourceEl = $('tr[data-file-id="' + source + '"]', element);
            sourceEl.addClass('ds-data-browser-processing');
            
            var opts = {
              src_resource: data.source,
              src_file_id: data.id,
              dest_resource: file.source,
              dest_file_id: file.id
            };
            if (dragAction === 'move') {
              DataService.move(opts).then(
                function (resp) {
                  logger.log(resp);
                  sourceEl.addClass('ds-data-browser-processing-success');
                  sourceEl.animate({'opacity': 0}, 250).promise().then(function () {
                    scope.data.listing.children = _.reject(scope.data.listing.children, function (child) {
                      return child.id === source;
                    });
                    scope.$apply();
                  });
                },
                function (err) {
                  logger.error(err);
                  // TODO
                  // window.alert('ERROR: Unable to move ' + source + ' to ' + dest + '.');
                  sourceEl.addClass('ds-data-browser-processing-danger');

                  setTimeout(function() {
                    sourceEl.removeClass('ds-data-browser-processing ds-data-browser-processing-danger');
                  }, 3000);
                }
              );
            } else if (dragAction === 'copy') {
              DataService.copy(opts).then(
                function (resp) {
                  sourceEl.addClass('ds-data-browser-processing-success');

                  setTimeout(function() {
                    sourceEl.removeClass('ds-data-browser-processing ds-data-browser-processing-success');
                  }, 3000);
                },
                function (err) {
                  logger.error(err);
                  // TODO
                  // window.alert('ERROR: Unable to copy ' + source + ' to ' + dest + '.');
                  sourceEl.addClass('ds-data-browser-processing-danger');

                  setTimeout(function() {
                    sourceEl.removeClass('ds-data-browser-processing ds-data-browser-processing-danger');
                  }, 3000);
                }
              );
            }

          }
        };
      }
    };
    
  }]);
})(window, angular, jQuery, _);

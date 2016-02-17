/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  /**
   * Overrides the default schema and look and feel of JBoss Forge commands
   */
  export function configureCommands($timeout, $templateCache, commandId, entity, schema) {
    var properties = schema.properties || {};
    var required = schema.required || [];
    _.forEach(required, (name) => {
      Core.pathSet(properties, [name, 'input-attributes', 'required'], true);
    });
    log.debug("Configuring schema, commandId: ", commandId);
    if (commandId === "project-new") {
      schema.controls = ["type", "*"];

      // lets hide the target location!
      var overwrite = properties.overwrite;
      var catalog = properties.catalog;
      var targetLocation = properties.targetLocation;
      var archetype = properties.archetype;
      var named = properties.named || {};
      named.title = "Name";
      Core.pathSet(named, ['input-attributes', 'pattern'], '[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)');

      var projectType = properties.type || {};
      projectType.formTemplate = $templateCache.get("forgeProjectTypeChooser.html");


      function hide(propertyName) {
        var property = properties[propertyName];
        if (property) {
          property.hidden = true;
        }
      }

      if (targetLocation) {
        targetLocation.hidden = true;
        if (overwrite) {
          overwrite.hidden = true;
        }
        log.debug("hiding targetLocation!");

        // lets default the type
/*
        if (!entity.type) {
          entity.type = "From Archetype Catalog";
        }
*/
      }
      if (catalog) {
        if (!entity.catalog) {
          entity.catalog = "fabric8";
        }
      }
      if (archetype) {
        archetype.formTemplate = $templateCache.get("devOpsArchetypeChooser.html");
      }

      projectType.isMavenProjectType = isMavenProjectType;

      // lets hide fields if the project type value is currently a non-maven project
      angular.forEach(["buildSystem", "finalName", "stack", "topLevelPackage", "version"], (propertyName) => {
        var property = properties[propertyName];
        if (property) {
          property['control-group-attributes'] = {
            'ng-show': "config.properties.type.isMavenProjectType(entity.type)"
          };
        }
      });

    } else if (commandId === "devops-edit") {
      var pipeline = properties.pipeline;
      if (pipeline) {
        pipeline.formTemplate = $templateCache.get("devOpsPipelineChooser.html");
      }
    } else if (commandId === "camel-edit-endpoint" || commandId === "camel-edit-endpoint-xml") {
      var endpoints = properties.endpoints;
      if (endpoints) {
        // remove the first dummy select value
        var values = endpoints.enum;
        if (values) {
          endpoints.enum = _.drop(values);
        }

        endpoints.selectors = {
          'select': (select) => {
            select.attr({size: '15'});
          }
        };
      }
    } else if (commandId === "camel-add-endpoint") {
      configureCamelComponentName(properties, $templateCache);

      hide("componentNameFilter");

      var current = entity.componentName;
      if (angular.isString(current)) {
        // lets hide some fields
        angular.forEach(["componentNameFilter", "componentName"], (propertyName) => {
          var property = properties[propertyName];
          if (property) {
            property.hidden = true;
          }
        })
      }
    } else if (commandId === "camel-add-endpoint-xml") {
      configureCamelComponentName(properties, $templateCache);


      // lets hide some fields
      angular.forEach(["xml", "node"], (propertyName) => {
        var property = properties[propertyName];
        if (property && entity[propertyName]) {
          property.hidden = true;
        }
      });
    } else if (commandId === "camel-add-node-xml") {
      configureCamelComponentName(properties, $templateCache);

      var name = properties.name;
      if (name) {
        name.formTemplate = $templateCache.get("camelPatternChooser.html");
/*
        angular.forEach(name.enum, (pattern) => {
          pattern.label = pattern.label || pattern.title || pattern.name;
        });
*/
      }

      // lets hide some fields
      angular.forEach(["xml", "parent"], (propertyName) => {
        var property = properties[propertyName];
        if (property && entity[propertyName]) {
          property.hidden = true;
        }
      });

    } else if (commandId === "camel-edit-node-xml") {
      var componentNameProperty = properties.componentName || {};
      componentNameProperty.formTemplate = $templateCache.get("camelComponentChooser.html");


      // lets hide some fields
      angular.forEach(["xml", "node"], (propertyName) => {
        var property = properties[propertyName];
        if (property && entity[propertyName]) {
          property.hidden = true;
        }
      });
    } else if (commandId.startsWith("camel-")) {
      configureCamelComponentName(properties, $templateCache);
    }
  }


  function configureCamelComponentName(properties, $templateCache) {
    var componentNameProperty = properties.componentName || {};
    componentNameProperty.formTemplate = $templateCache.get("camelComponentChooser.html");
    componentNameProperty.title = "Component";
  }

  function convertToStringArray(array, propertyName = "value") {
    if (angular.isArray(array)) {
      for (var i = 0, size = array.length; i < size; i++) {
        var value = array[i];
        if (!angular.isString(value) && angular.isObject(value)) {
          var textValue = value[propertyName];
          if (textValue) {
            array[i] = textValue;
          }
        }
      }
    }
  }
}

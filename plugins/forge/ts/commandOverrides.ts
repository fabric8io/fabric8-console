/// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>
/// <reference path="forgePlugin.ts"/>

module Forge {

  /**
   * Overrides the default schema and look and feel of JBoss Forge commands
   */
  export function configureCommands($timeout, $templateCache, commandId, entity, schema) {
    var properties = schema.properties || {};
    if (commandId === "project-new") {
      // lets hide the target location!
      var overwrite = properties.overwrite;
      var catalog = properties.catalog;
      var targetLocation = properties.targetLocation;
      var archetype = properties.archetype;
      if (targetLocation) {
        targetLocation.hidden = true;
        if (overwrite) {
          overwrite.hidden = true;
        }
        console.log("hiding targetLocation!");

        // lets default the type
        if (!entity.type) {
          entity.type = "From Archetype Catalog";
        }
      }
      if (catalog) {
        if (!entity.catalog) {
          entity.catalog = "fabric8";
        }
      }
      if (archetype) {
        archetype.formTemplate = $templateCache.get("devOpsArchetypeChooser.html");
      }
    } else if (commandId === "devops-edit") {
      var pipeline = properties.pipeline;
      if (pipeline) {
        pipeline.formTemplate = $templateCache.get("devOpsPipelineChooser.html");
      }
    } else if (commandId === "camel-edit-endpoint") {
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
      var componentNameProperty = properties.componentName || {};
      convertToStringArray(componentNameProperty.enum, "label");

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
    }
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

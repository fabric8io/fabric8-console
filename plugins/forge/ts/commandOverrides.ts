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
      var current = entity.componentName;
      if (angular.isString(current)) {
        var componentName = properties.componentName;
        if (componentName) {
          var components = componentName.enum;
          if (components) {
            angular.forEach(components, (component) => {
              var scheme = component.scheme || component.label;
              if (scheme && scheme === current) {
                entity.componentName = component;
              }
            });
          }
        }
      }
    }
  }
}

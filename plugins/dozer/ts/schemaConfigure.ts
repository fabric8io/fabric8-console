/// <reference path="dozerHelpers.ts"/>
/**
 * @module Dozer
 */
module Dozer {

  /**
   * Configures the JSON schemas to improve the UI models
   * @method schemaConfigure
   * @for Dozer
   */
  export function schemaConfigure(schemas) {
    io_hawt_dozer_schema_Field["tabs"] = {
      'Fields': ['a.value', 'b.value'],
      'From Field': ['a\\..*'],
      'To Field': ['b\\..*'],
      'Field Configuration': ['*']
    };
    io_hawt_dozer_schema_Mapping["tabs"] = {
      'Classes': ['a', 'b'],
      'From Class': ['classA'],
      'To Class': ['classB'],
      'Class Configuration': ['*']
    };

    // hide the fields table from the class configuration tab
    io_hawt_dozer_schema_Mapping.properties.fieldOrFieldExclude.hidden = true;

    Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "a", "properties", "value", "label"], "From Field");
    Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "b", "properties", "value", "label"], "To Field");

    io_hawt_dozer_schema_Mapping.properties['a'] = {
      type: 'string',
      label: 'From Class' 
    };
    io_hawt_dozer_schema_Mapping.properties['b'] = {
      type: 'string',
      label: 'To Class' 
    };

    // ignore prefixes in the generated labels
    Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "a", "ignorePrefixInLabel"], true);
    Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "b", "ignorePrefixInLabel"], true);
    Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-a", "ignorePrefixInLabel"], true);
    Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-b", "ignorePrefixInLabel"], true);

    // add custom widgets
    /*
    Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-a", "properties", "value", "formTemplate"], classNameWidget("class_a"));
    Core.pathSet(io_hawt_dozer_schema_Mapping, ["properties", "class-b", "properties", "value", "formTemplate"], classNameWidget("class_b"));

    Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "a", "properties", "value", "formTemplate"],
            '<input type="text" ng-model="dozerEntity.a.value" ' +
                  'typeahead="title for title in fromFieldNames($viewValue) | filter:$viewValue" ' +
                'typeahead-editable="true"  title="The Java class name"/>');
    Core.pathSet(io_hawt_dozer_schema_Field, ["properties", "b", "properties", "value", "formTemplate"],
            '<input type="text" ng-model="dozerEntity.b.value" ' +
                  'typeahead="title for title in toFieldNames($viewValue) | filter:$viewValue" ' +
                'typeahead-editable="true"  title="The Java class name"/>');

    function classNameWidget(propertyName) {
      return '<input type="text" ng-model="dozerEntity.' + propertyName + '.value" ' +
              'typeahead="title for title in classNames($viewValue) | filter:$viewValue" ' +
            'typeahead-editable="true"  title="The Java class name"/>';
    }
    */

    function toJavaType(ref) {
      return ref.replace(/^urn:jsonschema:/, '').replace(/:/g, '.');
    }

    function processProperties(schema) {
      if (schema.id) {
        var id = toJavaType(schema.id);
        schema.type = schema.javaType = id;
        var props = schema.properties;
        if (props) {
          // Massage the key names so they play nice with forms2
          var keys = _.keys(props);
          _.forEach(keys, (key) => {
            if (key.indexOf('-') !== -1) {
              var newKey = _.camelCase(key);
              props[newKey] = _.clone(props[key]);
              delete props[key];
            }
          });
          // Add any child objects to the schema registry
          _.forOwn(props, (prop, key) => {
            if (prop.type === "object") {
              processProperties(prop);
              if (prop.$ref) {
                prop.type = toJavaType(prop.$ref);
              }
            }
          });
          schemas.addSchema(schema.javaType, schema);
        }
      }
    };

    _.forEach([io_hawt_dozer_schema_Field, io_hawt_dozer_schema_Mapping, io_hawt_dozer_schema_Mappings], (schema) => {
      schema.javaType = schema.id;
      processProperties(schema);
    });
    schemas.iterate((schema) => {
      console.log("Schema: ", schema);
    });
  }
}

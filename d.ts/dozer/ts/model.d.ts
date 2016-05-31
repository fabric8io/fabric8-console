declare module Dozer {
    class Mappings {
        doc: any;
        mappings: Mapping[];
        constructor(doc: any, mappings?: Mapping[]);
    }
    class Mapping {
        map_id: string;
        class_a: MappingClass;
        class_b: MappingClass;
        fields: Field[];
        constructor();
        name(): string;
        hasFromField(name: string): Field;
        hasToField(name: string): Field;
        saveToElement(element: any): void;
    }
    class MappingClass {
        value: string;
        constructor(value: string);
        saveToElement(element: any): void;
    }
    class Field {
        a: FieldDefinition;
        b: FieldDefinition;
        constructor(a: FieldDefinition, b: FieldDefinition);
        name(): string;
        saveToElement(element: any): void;
    }
    class FieldDefinition {
        value: string;
        constructor(value: string);
        saveToElement(element: any): void;
    }
    class UnmappedField {
        fromField: string;
        property: any;
        toField: string;
        constructor(fromField: string, property: any, toField?: string);
    }
}

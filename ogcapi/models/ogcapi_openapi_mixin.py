# -*- coding: utf-8 -*-
#############################################################################
#
#    Odoo OGC API
#
#    Copyright (C) 2025-TODAY Geon Information Technologies Inc. (<https://www.geonbt.com.tr>)
#    Copyright (C) 2025-TODAY Nezih Gülesanlar (<postanezih@gmail.com>)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
#############################################################################

from odoo import models, _
from odoo.modules.module import get_module_resource
import json
import logging



_logger = logging.getLogger(__name__)


class OgcapiSchemaMixin(models.AbstractModel):
    _name = 'ogcapi.openapi.mixin'
    _description = 'OGC API Openapi Mixin'
    _abstract = True

    @classmethod
    def _get_static_schemas(cls):
        """
        Loads and returns static OpenAPI schemas from the ogcapi_static.json file.
        The result is cached at the class level.
        :return: Dictionary of static schemas.
        """
        if not hasattr(cls, '_openapi_static_schemas_cache'):
            static_path = get_module_resource('ogcapi', 'static', 'ogcapi_static.json')
            with open(static_path, 'r', encoding='utf-8') as f:
                cls._openapi_static_schemas_cache = json.load(f)
        return cls._openapi_static_schemas_cache

    def _get_oas_schema(self):
        """
        Builds and returns the OpenAPI schema for the OGC API, including all collections and endpoints.
        :return: Dictionary representing the OpenAPI specification.
        """
        paths = {}
        tags = [{
            'name': 'server',
            'description': self.description
        }]
        schemas = self._get_static_schemas()
        
        self._get_landing_page_schema(paths)
        self._get_conformance_schema(paths)
        self._get_api_schema(paths)
        self._get_collections_schema(paths)
        for collection in self.env['ogcapi.collection'].search([('api_id', '=', self.id)]):
            collection._get_collection_schema(paths)
            collection._get_feature_collection_schema(paths, schemas, tags)
            collection._get_feature_schema(paths, schemas, tags)
            collection._get_collection_schema_schema(paths)
        return {
            'openapi': '3.0.0',
            'info': {
                'contact': self.get_contact_info(),
                'title': self.title,
                'description': self.description,
                'license': self.get_license_info(),
                'version': "1.0.0",
                'termsOfService': "https://www.opengeospatial.org/ogc/legal",
            },
            'servers': self.get_server_info(),
            'components': {
                'parameters': self._get_oas_parameters(),
                'responses': self._get_oas_responses_schema(),
                'schemas': schemas,
            },
            'tags': tags,
            'paths': paths
        }

    def _get_landing_page_schema(self):
        """
        Returns the OpenAPI path and schema definition for the landing page endpoint.
        :return: Tuple of (path dict, schema dict).
        """    
        path={}
        schema={'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        path['/'] = {
                'get': {
                    'summary': _('Landing page'),
                    'description': _('Landing page'),
                    'operationId': "getLandingPage",
                    'parameters': [
                        {'$ref': "#/components/parameters/f"},
                        {'$ref': "#/components/parameters/lang"}
                    ],
                    'responses': {
                        '200': {
                            'description': _('Landing page'),
                            'content': {
                                'application/json': {
                                    'schema': { "$ref": "#/components/schemas/LandingPage" }
                                }
                            }
                        },
                        **self._get_response_errors_schema()
                    },
                    'tags': ['server']
                }
            }
        
        schema['components']['parameters']['f']= self._get_oas_parameters('f')
        schema['components']['parameters']['lang']= self._get_oas_parameters('lang')
        schema['components']['schemas']['LandingPage']= self._get_static_schemas()['LandingPage']
        return path, schema

    def _get_collections_schema(self):
        """
        Returns the OpenAPI path and schema definition for the collections endpoint.
        :return: Tuple of (path dict, schema dict).
        """
        path={}
        schema={'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        path['/collections'] = {
            'get': {
                'description': _('Collections'),
                'summary': _('Collections'),
                'operationId': "getCollections",
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"}
                ],
                'responses': {
                        '200': {
                            'description': _('Collections'),
                            'content': {
                                'application/json': {
                                    'schema': { "$ref": "#/components/schemas/Collections" }
                                }
                            }
                        },
                        **self._get_response_errors_schema()
                    },
                'tags': ['server']
            }
        }
        schema['components']['parameters']['f']= self._get_oas_parameters('f')
        schema['components']['parameters']['lang']= self._get_oas_parameters('lang')
        schema['components']['schemas']['Collections']= self._get_static_schemas()['Collections']
        return path, schema

    def _get_conformance_schema(self):
        """
        Returns the OpenAPI path and schema definition for the conformance endpoint.
        :return: Tuple of (path dict, schema dict).
        """
        path={}
        schema={'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        path['/conformance'] = {
            'get': {
                'description': _('API conformance definition'),
                'summary': _('API conformance definition'),
                'operationId': "getConformance",
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"}
                ],
                'responses': {
                        '200': {
                            'description': _('API conformance definition'),
                            'content': {
                                'application/json': {
                                    'schema': { "$ref": "#/components/schemas/Conformance" }
                                }
                            }
                        },
                        **self._get_response_errors_schema()
                    },
                'tags': ['server']
            }
        }
        schema['components']['parameters']['f']= self._get_oas_parameters('f')
        schema['components']['parameters']['lang']= self._get_oas_parameters('lang')
        schema['components']['schemas']['Conformance']= self._get_static_schemas()['Conformance']
        return path, schema
 
    def _get_open_api_schema(self):
        """
        Returns the OpenAPI path and schema definition for the OpenAPI document endpoint.
        :return: Tuple of (path dict, schema dict).
        """
        path={}
        schema={'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        schema['components']['parameters']['f'] = self._get_oas_parameters('f')
        schema['components']['parameters']['lang'] = self._get_oas_parameters('lang')
        schema['components']['responses']['Success'] = self._get_oas_responses_schema()['Success']
    
        path['/api'] = {
            'get': {
                'description': _('This document'),
                'summary': _('This document'),
                'operationId': "getOpenapi",
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"}
                ],
                'responses': {
                        '200': {
                            'description': _('OpenAPI 3.0 document'),
                            'content': {
                                'application/json': {
                                    'schema': { "$ref": "#/components/responses/Success" }
                                }
                            }
                        },
                        **self._get_response_errors_schema()
                    },
                'tags': ['server']
            }
        }
        return path, schema

    def _get_collection_schema(self):
        """
        Returns the OpenAPI path and schema definition for a single collection endpoint.
        :return: Tuple of (path dict, schema dict).
        """
        path = {}
        schema={'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        schema['components']['parameters']['f'] = self._get_oas_parameters('f')
        schema['components']['parameters']['lang'] = self._get_oas_parameters('lang')
        schema['components']['schemas']['Collection'] = self._get_static_schemas()['Collection']
        schema['components']['responses']['NotFound'] = self._get_oas_responses_schema()['NotFound']
        schema['components']['responses']['InternalServerError'] = self._get_oas_responses_schema()['InternalServerError']
        path[f'/collections/{self.name}'] = {
            'get': {
                'description': _('Collection'),
                'summary': _('Collection'),
                'operationId': "getCollection",
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"}
                ],
                'responses': {
                        '200': {
                            'description': _('Collection'),
                            'content': {
                                'application/json': {
                                    'schema': { "$ref": "#/components/schemas/Collection" }
                                }
                            }
                        },
                        **self._get_response_errors_schema()
                    },
                'tags': [self.name]
            }
        }
        return path, schema

    def _get_item_schema(self):
        """
        Returns the OpenAPI path and schema definition for a single feature (item) endpoint.
        :return: Tuple of (path dict, schema dict).
        """
        path= {}
        schema= {'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        schema['components']['parameters']['f'] = self._get_oas_parameters('f')
        schema['components']['parameters']['lang'] = self._get_oas_parameters('lang')
        schema['components']['parameters']['feature_id'] = self._get_oas_parameters('feature_id')
        schema['components']['parameters']['crs'] = self._get_oas_parameters('crs')
        schema['components']['responses']['NotFound'] = self._get_oas_responses_schema()['NotFound']
        schema['components']['responses']['InternalServerError'] = self._get_oas_responses_schema()['InternalServerError']
        
        geometry_type = self.geo_type or 'Geometry'
        feature_schema = self._get_base_feature_schema()
        feature_props = self._get_feature_props_schema()
        if "properties" in feature_props:
            feature_schema["properties"]["geometry"] = {
                "$ref": f"#/components/schemas/{geometry_type}"
            }
            feature_schema["properties"]["properties"] = feature_props
        schema['components']['schemas'][f"Feature_{self.name}"] = feature_schema

        path[f"/collections/{self.name}/items/{{feature_id}}"] = {
            'get': {
                'summary': _("Get feature from %s") % self.name,
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"},
                    {'$ref': "#/components/parameters/feature_id"},
                    {'$ref': "#/components/parameters/crs"}
                ],
                'responses': {
                    '200': {
                        'description': 'Feature',
                        'content': {
                            'application/geo+json': {
                                'schema': { "$ref": f"#/components/schemas/Feature_{self.name}" }
                            }
                        }
                    },
                    **self._get_response_errors_schema()
                },
                'tags': [self.name]
            }
        }
        return path, schema
            
    def _get_items_schema(self):
        """
        Returns the OpenAPI path and schema definition for the features (items) endpoint of a collection.
        :return: Tuple of (path dict, schema dict).
        """
        path= {}
        schema= {'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        schema['components']['parameters']['f'] = self._get_oas_parameters('f')
        schema['components']['parameters']['lang'] = self._get_oas_parameters('lang')
        schema['components']['parameters']['limit'] = self._get_oas_parameters('limit')
        schema['components']['parameters']['offset'] = self._get_oas_parameters('offset')
        schema['components']['parameters']['skipGeometry'] = self._get_oas_parameters('skipGeometry')
        schema['components']['parameters']['crs'] = self._get_oas_parameters('crs')
        schema['components']['parameters']['bbox'] = self._get_oas_parameters('bbox')
        schema['components']['parameters']['bbox-crs'] = self._get_oas_parameters('bbox-crs')
        schema['components']['parameters']['bbox-crs-epsg'] = self._get_oas_parameters('bbox-crs-epsg')
        schema['components']['responses']['NotFound'] = self._get_oas_responses_schema()['NotFound']
        schema['components']['responses']['InternalServerError'] = self._get_oas_responses_schema()['InternalServerError']
        schema['components']['schemas'][f"FeatureCollection_{self.name}"] = ""
        
        fc_schema = self._get_base_feature_collection_schema()
        fc_name = f"Feature_{self.name}"
        if "properties" in fc_schema:
            fc_schema["properties"]["features"]["items"] = {
                "$ref": f"#/components/schemas/{fc_name}"
            }
        schema['components']['schemas'][f"FeatureCollection_{self.name}"] = fc_schema
        path[f"/collections/{self.name}/items"] = {
            'get': {
                'summary': _("Get features from %s") % self.name,
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"},
                    {'$ref': "#/components/parameters/limit"},
                    {'$ref': "#/components/parameters/offset"},
                    {'$ref': "#/components/parameters/skipGeometry"},
                    {'$ref': "#/components/parameters/crs"},
                    {'$ref': "#/components/parameters/bbox"},
                    {'$ref': "#/components/parameters/bbox-crs"},
                    {'$ref': "#/components/parameters/bbox-crs-epsg"}
                ],
                'responses': {
                    '200': {
                        'description': 'FeatureCollection',
                        'content': {
                            'application/geo+json': {
                                'schema': { "$ref": f"#/components/schemas/FeatureCollection_{self.name}" }
                            }
                        }
                    },
                    **self._get_response_errors_schema()
                },
                'tags': [self.name]
            }
        }
        return path, schema

    def _get_collection_api_schema(self):
        """
        Returns the OpenAPI path and schema definition for the feature schema endpoint of a collection.
        :return: Tuple of (path dict, schema dict).
        """
        path= {}
        schema= {'components': {
            'parameters': {},
            'responses': {},
            'schemas': {}
        }}
        schema['components']['parameters']['f'] = self._get_oas_parameters('f')
        schema['components']['parameters']['lang'] = self._get_oas_parameters('lang')
        schema['components']['responses']['Success'] = self._get_oas_responses_schema()['Success']
        schema['components']['responses']['NotFound'] = self._get_oas_responses_schema()['NotFound']
        schema['components']['responses']['InternalServerError'] = self._get_oas_responses_schema()['InternalServerError']
        path[f"/collections/{self.name}/schema"] = {
            'get': {
                'summary': _("Get Schema from %s") % self.name,
                'parameters': [
                    {'$ref': "#/components/parameters/f"},
                    {'$ref': "#/components/parameters/lang"},
                ],
                'responses': {
                    '200': {
                        'description': 'Feature Schema',
                        'content': {
                            'application/json': {
                                'schema': { "$ref": f"#/components/responses/Success" }
                            }
                        }
                    },
                    **self._get_response_errors_schema()
                },
                'tags': [self.name]
            }
        }
        return path, schema

    def _get_response_errors_schema(self):
        return {
            '404': {
                '$ref': '#/components/responses/NotFound'
            },
            '500': {
                '$ref': '#/components/responses/InternalServerError'
            }
        }

    def _get_oas_responses_schema(self):
        """
        Returns a dictionary of standard OpenAPI response schemas for the OGC API.
        :return: Dictionary with response definitions.
        """
        return {
            "NotFound": {
                "description": "Resource not found",
                "content": {
                "application/json": {
                    "schema": {
                    "$ref": "#/components/schemas/Error"
                    }
                }
                }
            },
            "InternalServerError": {
                "description": "Internal server error",
                "content": {
                "application/json": {
                    "schema": {
                    "$ref": "#/components/schemas/Error"
                    }
                }
                }
            },
            "Success": {
                "description": "Successful response",
                "content": {
                    "application/json": {
                        "schema": {
                        "type": "object"
                        }
                    }
                }
            }
        }

    def _get_base_openapi_data(self):
        return {
            'openapi': "3.0.0",
            'info': {},
            'servers': [],
            'components':{},
            'paths': {},
            'tags': []
        }

    def _get_base_feature_schema(self):
        return {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["Feature"]
                },
                "id": {
                    "type": "string"
                },
                "geometry": {
                    "$ref": "#/components/schemas/Geometry"
                },
                "properties": {
                    "type": "object"
                }
            },
            "required": ["type", "geometry", "properties"]
        }

    def _get_base_feature_collection_schema(self):
        return {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["FeatureCollection"]
                },
                "features": {
                    "type": "array",
                    "items": {
                        "$ref": "#/components/schemas/Feature"
                    }
                },
                "numberMatched": {
                    "type": "integer"
                },
                "numberReturned": {
                    "type": "integer"
                },
                "timeStamp": {
                    "type": "string",
                    "format": "date-time"
                }
            },
            "required": ["type", "features"]
        }

    def _get_feature_props_schema(self):
        """
        Generates a JSON schema for feature properties based on the feature fields.

        This method iterates over the feature fields, determines the appropriate JSON schema type
        for each field (e.g., string, number, integer, boolean, date, date-time), and constructs
        a schema dictionary with 'properties' and 'required' fields. The resulting schema can be
        used for OpenAPI documentation or data validation.

        Returns:
            dict: A JSON schema object describing the feature properties.
        """
        feature_fields = self._get_feature_fields()
        properties = {}
        required = []
        for field_name, field in feature_fields.items():
            field_type = field.get('type')
            if field_type in ['char', 'text']:
                properties[field_name] = {'type': 'string'}
            elif field_type in ['float', 'monetary']:
                properties[field_name] = {'type': 'number'}
            elif field_type == 'integer':
                properties[field_name] = {'type': 'integer'}
            elif field_type == 'boolean':
                properties[field_name] = {'type': 'boolean'}
            elif field_type == 'date':
                properties[field_name] = {'type': 'string', 'format': 'date'}
            elif field_type == 'datetime':
                properties[field_name] = {'type': 'string', 'format': 'date-time'}
            # ...diğer field tipleri...
            if field.get('required'):
                required.append(field_name)

        return {
            "type": "object",
            "required": required,
            "properties": properties
        }
    
    def _get_oas_parameters(self, param_key=None):
        """
        Returns a dictionary of OpenAPI parameters used in the OGC API.
        If a specific parameter key is provided, returns only that parameter.
        :param param_key: Optional; if provided, returns only the specified parameter.
        :return: Dictionary of parameters.
        """
        parameters = {
            'f': {
                'name': 'f',
                'in': 'query',
                'description': _("The response format (e.g., json, html)."),
                'required': False,
                'schema': {
                    'type': 'string',
                    'enum': ['json', 'html', 'jsonld'],
                    'default': 'json'
                },
                'style': 'form',
                'explode': False
            },
            'lang': {
                'name': 'lang',
                'in': 'query',
                'description': _("The language for the response (e.g., en, tr)."),
                'required': False,
                'schema': {
                    'type': 'string',
                    'enum': [
                        "en-US", "tr-TR"
                        ],
                    'default': "en-US"
                }
            },
            'skipGeometry': {
                'name': 'skipGeometry',
                'in': 'query',
                'description': _("If true, the geometry will be omitted from the response."),
                'required': False,
                'style': 'form',
                'explode': False,
                'schema': {
                    'type': 'boolean',
                    'default': False
                }
            },
            'crs': {
                'name': 'crs',
                'in': 'query',
                'description': _("The Coordinate Reference System to be used for the response."),
                'style': 'form',
                'required': False,
                'explode': False,
                'schema': {
                    'format': 'uri',
                    'type': 'string'
                }
            },
            'bbox': {
                'name': 'bbox',
                'in': 'query',
                'description': _("A bounding box to filter features spatially (minX,minY,maxX,maxY)."),
                'required': False,
                'style': 'form',
                'explode': False,
                'schema': {
                    'type': 'array',
                    'minItems': 4,
                    'maxItems': 6,
                    'items': {
                        'type': 'number'
                    }
                }
            },
            'bbox-crs': {
                'name': 'bbox-crs',
                'in': 'query',
                'description': _("The CRS used for the bounding box coordinates."),
                'style': 'form',
                'required': False,
                'explode': False,
                'schema': {
                    'format': 'uri',
                    'type': 'string'
                }
            },
            'bbox-crs-epsg': {
                'name': 'bbox-crs',
                'in': 'query',
                'description': _("The EPSG code for the bounding box CRS."),
                'required': False,
                'style': 'form',
                'explode': False,
                'schema': {
                    'type': 'integer',
                    'default': 4326
                }
            },
            'offset': {
                'name': 'offset',
                'in': 'query',
                'description': _("The number of features to skip before starting to return results."),
                'required': False,
                'schema': {
                    'type': 'integer',
                    'minimum': 0,
                    'default': 0
                },
                'style': 'form',
                'explode': False
            },
            'vendorSpecificParameters': {
                'name': 'vendorSpecificParameters',
                'in': 'query',
                'description': _("Additional 'free-form' parameters that are not explicitly defined."),
                'schema': {
                    'type': 'object',
                    'additionalProperties': True
                },
                'style': 'form'
            },
            'limit': {
                'name': 'limit',
                'in': 'query',
                'description': _("The maximum number of features to return in the response."),
                'required': False,
                'schema': {
                    'type': 'integer',
                    'minimum': 1,
                    'maximum': 10000,
                    'default': 100
                },
                'style': 'form',
                'explode': False
            },
            'feature_id': {
                'name': 'feature_id',
                'in': 'path',
                'description': _("The unique identifier of a feature. Used as a path parameter to retrieve a single feature by its ID. (Type: string, Required: Yes)"),
                'required': True,
                'schema': { 'type': 'string' }
            }
        }
        if param_key:
            return parameters.get(param_key, {})
        return parameters
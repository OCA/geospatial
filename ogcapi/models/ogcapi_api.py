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

from odoo import models, fields, _
import logging
import json

#############################################################################

_logger = logging.getLogger(__name__)



class OgcapiApi(models.Model):
    _name = 'ogcapi.api'
    _description = 'OGC API Model'
    _inherit = ['ogcapi.openapi.mixin']

    name = fields.Char(string='Name', required=True)
    title = fields.Char(string='Title', required=True)
    description = fields.Text(string='Description', required=True)
    contact_id = fields.Many2one(
        comodel_name='res.partner',
        string='Service Contact',
        domain="[('is_company','=',False)]"
        )
    keywords = fields.Many2many('ogcapi.keyword', string="Keywords")
    
    
    
    def action_api_collections(self):
        """
        Returns an action to open the collections related to this API in a tree or form view.

        :return: Dictionary representing the Odoo action.
        :rtype: dict
        """
        return {
            'name':_('Collections'),
            'res_model' : 'ogcapi.collection',
            'view_mode' : 'tree,form',
            'context'   : {'default_api_id':self.id},
            'domain'    : [('api_id','=',self.id)],
            'target'    : 'current',
            'type'      : 'ir.actions.act_window', 
        }
    
    def _get_contact_info(self):
        """
        Returns the contact information for the OGC API.

        :return: Dictionary with contact details (name, email, url, phone).
        :rtype: dict
        """
        return {
            'name': self.contact_id.name,
            'email': self.contact_id.email or '',
            'url': self.contact_id.website or '',
            'phone': self.contact_id.phone or ''
        }
    
    def _get_license_info(self):
        """
        Returns the license information for the OGC API.

        :return: Dictionary with license name and URL.
        :rtype: dict
        """
        return {
            'name': 'OGC API License',
            'url': 'https://www.opengeospatial.org/ogc/legal'
        }
           
    def _get_server_info(self):
        """
        Returns the server information for the OGC API.

        :return: Dictionary with server URL and description.
        :rtype: dict
        """
        return {
            'url': f"{self.get_base_url()}/ogcapi/{self.name}",
            'description': self.title
        }


    def get_landing_page(self):
        """
        Returns the landing page information for the OGC API.

        :return: Dictionary with API name, title, description, and related links.
        :rtype: dict
        """
        base_url = self.get_base_url()
        return {
            'name': self.name,
            'title': self.title,
            'description': self.description,
            'links': [
                {
                    'href': f"{base_url}/ogcapi/{self.name}",
                    'rel': "self",
                    'type': "application/json",
                    'title': "This document"
                },
                {
                    'href': f"{base_url}/ogcapi/{self.name}/conformance",
                    'rel': "conformance",
                    'type': "application/json",
                    'title': "OGC Conformance",
                },
                {
                    'href': f"{base_url}/ogcapi/{self.name}/collections",
                    'rel': "data",
                    'type': "application/json",
                    'title': "Collections",
                },
                {
                    'href': f"{base_url}/ogcapi/{self.name}/api?f=json",
                    'rel': "service-desc",
                    'type': "application/vnd.oai.openapi+json;version=3.0",
                    'title': "OpenAPI definition",
                },
                {
                    'rel': 'service-doc',
                    'href': f"{base_url}/ogcapi/{self.name}/api?f=html",
                    'type': 'text/html',
                    'title': "OpenAPI definition",
                }
            ]
        }

    def get_conformance(self):
        """
        Returns the conformance information for the OGC API.

        :return: Dictionary with conformance URIs, related links, and timestamp.
        :rtype: dict
        """
        base_url = self.get_base_url()
        return {
            'conformsTo': [
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/html",
                "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson"
            ],
            'links': [
                {
                    'rel': 'self',
                    'href': f"{base_url}/ogcapi/{self.name}/conformance",
                    'type': 'application/json'
                },
                {
                    'rel': 'service-desc',
                    'href': f"{base_url}/ogcapi/{self.name}/api?f=json",
                    'type': 'application/vnd.oai.openapi+json;version=3.0'
                },
                {
                    'rel': 'service-doc',
                    'href': f"{base_url}/ogcapi/{self.name}/api?f=html",
                    'type': 'text/html'
                }
            ],
            'timestamp': fields.Datetime.now(),
        }
    
    def get_open_api(self):
        """
        Returns the OpenAPI definition for the OGC API, including paths, schemas, parameters, and responses.

        :return: Dictionary representing the OpenAPI specification.
        :rtype: dict
        """
        schemas = self._get_static_schemas()
        paths = {}
        tags = []
        openapi_data = self._get_base_openapi_data()
        openapi_data['servers'].append(self._get_server_info()) 
        openapi_data["info"] = {
            'title': self.title,
            'description': self.description,
            'version': "1.0.0",
            'contact': self._get_contact_info(),
            'license': self._get_license_info()
        }
        # update landing page schema
        path, schema = self._get_landing_page_schema()
        paths.update(path)
        # update collections schema
        path, schema = self._get_collections_schema()
        paths.update(path)
        # update conformance schema
        path, schema = self._get_conformance_schema()
        paths.update(path)
        # update api schema
        path, schema = self._get_open_api_schema()
        paths.update(path)
        for collection in self.env['ogcapi.collection'].search([('api_id', '=', self.id)]):
            path, schema = collection._get_collection_schema()
            paths.update(path)
            path, schema = collection._get_items_schema()
            paths.update(path)
            schemas.update({f"FeatureCollection_{collection.name}": schema['components']['schemas'][f"FeatureCollection_{collection.name}"]})
            path, schema = collection._get_item_schema()
            paths.update(path)
            schemas.update({f"Feature_{collection.name}": schema['components']['schemas'][f"Feature_{collection.name}"]})
            
        openapi_data["components"]["parameters"] = self._get_oas_parameters()
        openapi_data["components"]["responses"] = self._get_oas_responses_schema()

        openapi_data['paths'] = paths
        openapi_data["components"]["schemas"] = schemas
        openapi_data['tags'] = tags

        
        return openapi_data
    
    def get_collections(self):
        """
        Returns the list of collections for this API, including metadata and links for each collection.

        :return: Dictionary with collections and related links.
        :rtype: dict
        """
        base_url = self.get_base_url()
        collections = self.env['ogcapi.collection'].search([('api_id', '=', self.id)])
        result = []
        for coll in collections:
            coll_dict = {
                "id": coll.name,
                "title": coll.title,
                "description": coll.description or "",
                "links": [
                    {
                        "href": f"{base_url}/ogcapi/{self.name}/collections/{coll.name}",
                        "rel": "self",
                        "type": "application/json",
                        "title": f"Metadata for {coll.title}"
                    },
                    {
                        "href": f"{base_url}/ogcapi/{self.name}/collections/{coll.name}/items",
                        "rel": "items",
                        "type": "application/geo+json",
                        "title": f"Features of {coll.title}"
                    }
                ]
            }
            if coll.extent:
                try:
                    bbox = json.loads(coll.extent)
                    coll_dict["extent"] = {
                        "spatial": {
                            "bbox": [bbox],
                            "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                        }
                    }
                except Exception:
                    pass
            if coll.keywords:
                coll_dict["keywords"] = [kw.name for kw in coll.keywords]
            result.append(coll_dict)
        return {
            "collections": result,
            "links": [
                {
                    "rel": "self",
                    "href": f"{base_url}/ogcapi/{self.name}/collections",
                    "type": "application/json"
                }
            ]
        }


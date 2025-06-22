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

import json
import logging
import functools
import base64

from odoo import _, http
from odoo.http import request, Response

from werkzeug.exceptions import BadRequest
from odoo.addons.portal.controllers.portal import CustomerPortal


_logger = logging.getLogger(__name__)

def authenticate(func):
    @functools.wraps(func)
    def validate_api_key(*args, **kw):
        lang = kw.get('lang')
        if lang:
            request.update_context(lang=lang)
        # request has session
        if request.session.uid:
            return func(*args, **kw)
        
        auth_header = request.httprequest.headers.get('Authorization')
        if not auth_header:
            raise BadRequest('Authorization header missing')
        
        # basic auth
        if auth_header.startswith('Basic '):
            auth_header = auth_header[6:]
            if not request.db:
                raise Exception(_("Could not select database '%s'", request.db))
            cred_text = base64.b64decode(auth_header).decode('utf-8')
            login = cred_text.split(':')[0]
            password = cred_text.split(':')[1]
            try:
                request.session.authenticate(request.db, login, password)
            except Exception as e:
                return request.make_json_response({'error': str(e)}, status=401)
            return func(*args, **kw)
        # auth via api key
        elif auth_header.startswith('Bearer '):
            auth_header = auth_header[7:]
            user_id = request.env["res.users.apikeys"]._check_credentials(scope='rpc', key=auth_header)
            if not user_id:
                raise BadRequest('Access token invalid')
            # take the identity of the API key user
            request.update_env(user=user_id)
            # switch to the user context
            request.update_context(**request.env.user.context_get())
            return func(*args, **kw)
        else:            
            raise BadRequest('Authorization header invalid')
    return validate_api_key

def ogcapi_error_response(code, description, status=400):
    """
    Returns a standardized OGC API error response.
    """
    import json
    return Response(
        json.dumps({
            "code": code,
            "description": description,
            "status": status
        }),
        status=status,
        content_type='application/json'
    )

class CustomerPortal(CustomerPortal):
    
    def _prepare_home_portal_values(self, counters):
        values = super()._prepare_home_portal_values(counters)
        if "ogcapi_api_count" in counters:
            count = request.env["ogcapi.api"].search_count([])
            values["ogcapi_api_count"] = count
        return values
    
    @authenticate
    @http.route(['/ogcapi','/my/ogcapi'], type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def my_ogcapi(self, **kw):
        """
        My OGC API page
        """
        items = request.env["ogcapi.api"].search([])
        values={
                "result": items,
                "page_name": "ogcapi_list",

            }
        return request.render("ogcapi.portal_my_api", values)
    
    @authenticate
    @http.route('/ogcapi/<string:api_name>', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def landing_page(self, api_name, **kw):
        """
        getLandingPage
        OGC API landing page endpoint
        """

        _logger.info("Request for OGC API landing page: %s", request.env.context.get('lang', 'default'))
        req_format = kw.get('f', 'json').lower()
        if req_format not in {'json', 'html'}:
            req_format = 'json'
        
        if api_name:
            api_ = request.env['ogcapi.api'].sudo().search(domain=[["name","=", api_name]], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            result = api_.get_landing_page()  

            return request.make_json_response(result)
        
        return {}
    
    @authenticate
    @http.route('/ogcapi/<string:api_name>/conformance', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def conformance(self, api_name):
        """
        getConformance
        OGC API Conformance endpoint"""
        if api_name:
            api_ = request.env['ogcapi.api'].sudo().search(domain=[["name","=", api_name]], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            result = api_.get_conformance()  

            return request.make_json_response(result)
        
        return {}

    @authenticate
    @http.route('/ogcapi/<string:api_name>/collections', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def collections(self, api_name):
        """
        getConformanceDeclaration
        # OGC API Collections endpoint
        """
        if api_name:
            api_ = request.env['ogcapi.api'].sudo().search(domain=[["name","=", api_name]], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            result = api_.get_collections()

            return request.make_json_response(result)
        
        return {}

    @authenticate
    @http.route(['/ogcapi/<string:api_name>/api','/my/ogcapi/<string:api_name>/api'], type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def openapi(self, api_name, **kw):
        """
        getOpenAPI
        OGC API OpenAPI Schema endpoint
        """
        reqFormat = kw.get('f') or 'json'
        if reqFormat not in ['json','html']:
            reqFormat = 'json'
        if api_name:
            api_ = request.env['ogcapi.api'].sudo().search(domain=[["name","=", api_name]], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            result = api_.get_open_api()
            if reqFormat == 'html':
                values = {
                    'openapi': json.dumps(result),
                    'api_name': api_name,
                    'page_name': 'openapi_page',
                }
                return request.render('ogcapi.swagger_ui_template', values)
            else:
                return request.make_json_response(result, headers=[('Content-Type', 'application/vnd.oai.openapi+json;version=3.0')])
            
    @authenticate
    @http.route('/ogcapi/<string:api_name>/collections/<string:collection_name>', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def collection(self, api_name, collection_name):
        """
        getCollection
        OGC API Collection endpoint
        """
        if api_name and collection_name:
            api_ = request.env['ogcapi.api'].sudo().search([('name', '=', api_name)], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            collection = request.env['ogcapi.collection'].sudo().search([
                ('api_id', '=', api_.id),
                ('name', '=', collection_name)
            ], limit=1)
            if not collection:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("Collection with name '%s' not found.") % collection_name,
                    status=404
                )
            result = collection.get_collection()
            return request.make_json_response(result)
        return ogcapi_error_response(
            code='InvalidParameterValue',
            description=_("Missing api_name or collection_name."),
            status=400
        )
        
    @authenticate
    @http.route('/ogcapi/<string:api_name>/collections/<string:collection_name>/items', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def collection_items(self, api_name, collection_name, **kw):
        """
        getCollectionItems
        OGC API Collection Items endpoint
        """
        req_format = kw.get('f', 'json').lower()
        if req_format not in {'json', 'html'}:
            req_format = 'json'
        offset = kw.get('offset', 0)
        limit = kw.get('limit', 10)
        bbox = kw.get('bbox', None)
        crs= kw.get('crs', None)
        bbox_crs = kw.get('bbox-crs', None)
        bbox_crs_epsg = kw.get('bbox-crs-epsg', None)
        skip_geometry = kw.get('skipGeometry', 'false').lower() == 'true'
        if api_name and collection_name:
            api_ = request.env['ogcapi.api'].sudo().search([('name', '=', api_name)], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            collection = request.env['ogcapi.collection'].sudo().search([
                ('api_id', '=', api_.id),
                ('name', '=', collection_name)
            ], limit=1)
            if not collection:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("Collection with name '%s' not found.") % collection_name,
                    status=404
                )
            # Burada koleksiyonun itemlarını döndürmelisin
            result = collection.get_items(
                offset=offset,
                limit=limit,
                crs=crs,
                bbox=bbox,
                bbox_crs=bbox_crs,
                bbox_crs_epsg=bbox_crs_epsg,
                skip_geometry=skip_geometry
            )
            return request.make_json_response(result)
        return ogcapi_error_response(
            code='InvalidParameterValue',
            description=_("Missing api_name or collection_name."),
            status=400
        )
        
    @authenticate
    @http.route('/ogcapi/<string:api_name>/collections/<string:collection_name>/items/<string:feature_id>', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def collection_item(self, api_name, collection_name, feature_id, **kw):
        """
        getCollectionItem
        OGC API Single Feature endpoint
        """
        crs= kw.get('crs', None)
        if api_name and collection_name and feature_id:
            api_ = request.env['ogcapi.api'].sudo().search([('name', '=', api_name)], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            collection = request.env['ogcapi.collection'].sudo().search([
                ('api_id', '=', api_.id),
                ('name', '=', collection_name)
            ], limit=1)
            if not collection:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("Collection with name '%s' not found.") % collection_name,
                    status=404
                )
            # Burada tekil feature'ı döndürmelisin
            result = collection.get_item(feature_id, crs)  # get_feature fonksiyonunu modelde tanımlamalısın
            if not result:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("Feature with ID: '%s' not found.") % feature_id,
                    status=404
                )
            return request.make_json_response(result)
        return ogcapi_error_response(
            code='InvalidParameterValue',
            description=_("Missing api_name, collection_name or feature_id."),
            status=400
        )
        
    @authenticate
    @http.route('/ogcapi/<string:api_name>/collections/<string:collection_name>/schema', type='http', auth='public', methods=['GET'], csrf=False, website=True)
    def collection_schema(self, api_name, collection_name):
        """
        getCollectionSchema
        OGC API Collection Schema endpoint
        """
        if api_name and collection_name:
            api_ = request.env['ogcapi.api'].sudo().search([('name', '=', api_name)], limit=1)
            if not api_:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("API with name '%s' not found.") % api_name,
                    status=404
                )
            collection = request.env['ogcapi.collection'].sudo().search([
                ('api_id', '=', api_.id),
                ('name', '=', collection_name)
            ], limit=1)
            if not collection:
                return ogcapi_error_response(
                    code='NotFound',
                    description=_("Collection with name '%s' not found.") % collection_name,
                    status=404
                )
            result = collection.get_collection_schema()
            return request.make_json_response(result)
        return ogcapi_error_response(
            code='InvalidParameterValue',
            description=_("Missing api_name or collection_name."),
            status=400
        )


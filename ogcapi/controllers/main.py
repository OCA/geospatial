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

import base64
import binascii
import functools
import json
import logging

from odoo import _, http
from odoo.http import Response, request

from .. import (
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    MethodNotAllowedException,
    NotFoundException,
    OgcapiException,
    UnauthorizedException,
)

_logger = logging.getLogger(__name__)


def _authenticate_basic(auth_header):
    if not request.db:
        raise InternalServerErrorException()
    try:
        cred_text = base64.b64decode(auth_header).decode("utf-8")
        if ":" not in cred_text:
            raise UnauthorizedException()
        login, password = cred_text.split(":", 1)
        uid = request.session.authenticate(request.db, login, password)
        if uid:
            return True
        raise UnauthorizedException()
    except (binascii.Error, UnicodeDecodeError) as err:
        raise ForbiddenException() from err
    except Exception as err:
        _logger.warning("Authentication failed: %s", str(err))
        raise UnauthorizedException() from err


def _authenticate_bearer(auth_header):
    try:
        user_id = request.env["res.users.apikeys"]._check_credentials(
            scope="rpc", key=auth_header
        )
        if not user_id:
            raise UnauthorizedException()
        request.update_env(user=user_id)
        request.update_context(**request.env.user.context_get())
        return True
    except Exception as err:
        _logger.error("Bearer authentication error: %s", str(err))
        raise UnauthorizedException() from err


def _validate_path_parameters(path, kw):
    """It validates the path parameters."""
    pargs = {}
    for param in path.parameter_ids:
        if param.code not in kw or not kw.get(param.code, None):
            raise BadRequestException(
                _("Missing required parameter: {param_code}").format(
                    param_code=param.code
                )
            )
        pargs[param.code] = kw.pop(param.code, None)
    return pargs


def _get_operation(path, http_method):
    """It returns the appropriate operation object for the path, or raises an error."""
    operation = path.api_ids.filtered(lambda r: r.http_method == http_method)
    if not operation.exists():
        raise MethodNotAllowedException(
            _("Operation not allowed for path: {path_name}").format(
                path_name=path.complete_name
            )
        )
    return operation


def handle_request(path_code):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, **kw):
            path = request.env["ogcapi.api.path"].search(
                [("code", "=", path_code)], limit=1
            )
            if not path.exists():
                raise NotFoundException(
                    _("Path configuration not found for code: {path_code}").format(
                        path_code=path_code
                    )
                )
            pargs = _validate_path_parameters(path, kw)
            operation = _get_operation(path, request.httprequest.method.lower())
            qargs = operation.validate_query_parameters(qargs=kw)
            return func(self, operation, pargs, qargs)

        return wrapper

    return decorator


def _handle_language(lang_code=None):
    lang_param = (
        request.env["ogcapi.component.parameter"]
        .sudo()
        .search([("code", "=", "lang")], limit=1)
    )
    if not lang_param.exists():
        return "en"
    lang_enums = (
        [v.strip() for v in lang_param.enum.split(",") if v.strip()]
        if lang_param.enum
        else ["en"]
    )
    api_lang = "en"
    if not lang_code:
        lang_code = lang_param.default or lang_enums[0] or api_lang
    if lang_code not in lang_enums:
        raise BadRequestException(
            _("Invalid language parameter: {lang_code}").format(lang_code=lang_code)
        )

    odoo_lang = (
        request.env["res.lang"]
        .sudo()
        .search([("active", "=", True), ("iso_code", "like", f"{lang_code}%")], limit=1)
    )
    if odoo_lang:
        request.update_context(lang=odoo_lang.code)
    return lang_code


def authenticate(func):
    """OGC API authentication decorator."""

    @functools.wraps(func)
    def wrapper(*args, **kw):
        req_lang = kw.get("lang", None)
        api_lang = _handle_language(req_lang)
        kw["lang"] = api_lang if api_lang else "en"
        if request.session.uid:
            return func(*args, **kw)
        auth_header = request.httprequest.headers.get("Authorization")
        if not auth_header:
            raise UnauthorizedException()

        if auth_header.startswith("Basic "):
            success = _authenticate_basic(auth_header[6:])
        elif auth_header.startswith("Bearer "):
            success = _authenticate_bearer(auth_header[7:])
        else:
            raise UnauthorizedException()
        if success:
            return func(*args, **kw)
        raise UnauthorizedException()

    return wrapper


def handle_api_exceptions(func):
    """Decorator to handle API exceptions in controller methods"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except OgcapiException as e:
            result = request.env["ogcapi.core.mixin"].error_result(e)
            return make_api_response(result)
        except Exception as e:
            result = request.env["ogcapi.core.mixin"].error_result(str(e))
            return make_api_response(result)

    return wrapper


def _build_response_headers(mime_type, html=False):
    headers = [
        ("Content-Type", mime_type),
        ("Cache-Control", "no-cache, no-store"),
        ("Access-Control-Allow-Origin", "*"),
    ]
    if not html:
        headers.append(("Access-Control-Allow-Methods", "GET, OPTIONS"))
    return headers


def make_api_response(result, operation=None, response_format=None, template=None):
    """
    Helper function to process API results and convert them to HTTP responses
    """
    response_format = response_format or "json"
    formats = (
        operation.get_available_formats() if operation else {"json": "application/json"}
    )
    mime_type = formats.get(response_format, "application/json")

    success = result.get("success", False)

    if response_format == "html" and template:
        html = request.env["ir.ui.view"].render_template(
            template, result.get("data", {})
        )
        headers = _build_response_headers(mime_type, html=True)
        return Response(html, status=result.get("status", 200), headers=headers)

    headers = _build_response_headers(mime_type)
    if success:
        return Response(
            json.dumps(result["data"]),
            status=result.get("status", 200),
            headers=headers,
        )
    return Response(
        json.dumps(result, default=str),
        status=result.get("status", 400),
        headers=headers,
    )


class OgcapiController(http.Controller):
    """
    OGC API Controller
    Handles OGC API requests and responses.
    """

    @handle_api_exceptions
    @authenticate
    @handle_request("landing")
    @http.route(
        "/ogcapi/<string:workspaceId>",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def landing(self, operation, pargs, qargs):
        """OGC API Landing Page endpoint"""
        result = operation.get_landing(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("conformance")
    @http.route(
        "/ogcapi/<string:workspaceId>/conformance",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def conformance(self, operation, pargs, qargs):
        """OGC API Conformance endpoint"""
        result = operation.get_conformance(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("api")
    @http.route(
        "/ogcapi/<string:workspaceId>/api",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def openapi(self, operation, pargs, qargs):
        """OGC API OpenAPI Schema endpoint"""
        result = operation.get_openapi(pargs, qargs)
        return make_api_response(
            result,
            operation=operation,
            response_format="json",
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("collections")
    @http.route(
        """/ogcapi/<string:workspaceId>/collections""",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def collections(self, operation, pargs, qargs):
        """OGC API Collections endpoint"""
        result = operation.get_collections(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("collection")
    @http.route(
        """/ogcapi/<string:workspaceId>/collections/<string:collectionId>""",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def collection(self, operation, pargs, qargs):
        """OGC API Collection endpoint"""
        result = operation.get_collection(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("items")
    @http.route(
        "/ogcapi/<string:workspaceId>/collections/<string:collectionId>/items",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def items(self, operation, pargs, qargs):
        """OGC API Collection Items endpoint"""
        result = operation.get_items(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("item")
    @http.route(
        (
            "/ogcapi/<string:workspaceId>/collections/<string:collectionId>/items/"
            "<string:featureId>"
        ),
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def item(self, operation, pargs, qargs):
        """OGC API Collection Item endpoint"""
        result = operation.get_item(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @authenticate
    @handle_request("schema")
    @http.route(
        "/ogcapi/<string:workspaceId>/collections/<string:collectionId>/schema",
        type="http",
        auth="public",
        methods=["GET"],
        csrf=False,
    )
    def schema(self, operation, pargs, qargs):
        """
        getCollectionSchema
        OGC API Collection Schema endpoint
        """
        result = operation.get_schema(pargs, qargs)
        return make_api_response(
            result, operation=operation, response_format=qargs.get("f", "json")
        )

    @handle_api_exceptions
    @http.route(
        ["/ogcapi", "/ogcapi/<path:anything>"],
        type="http",
        auth="public",
        methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        csrf=False,
    )
    def ogcapi_catch_all(self, anything=None, **kw):
        """
        Catch-all for undefined /ogcapi/* endpoints.
        """
        raise BadRequestException()

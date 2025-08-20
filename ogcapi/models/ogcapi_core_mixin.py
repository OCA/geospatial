import functools
import logging
from urllib.parse import urlencode

from odoo import _, models

from .ogcapi_exceptions import (
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
    OgcapiException,
)

_logger = logging.getLogger(__name__)


def safe_api(func=None, description=None):
    """Exception yakalamak için decorator"""

    def decorator(f):
        desc = description or f.__name__

        @functools.wraps(f)
        def wrapper(self, *args, **kwargs):
            try:
                return f(self, *args, **kwargs)
            except OgcapiException:
                raise
            except Exception as e:
                _logger.exception("Error in %s: %s", desc, e)
                raise InternalServerErrorException(
                    _("Unexpected error in {desc}: {error}").format(
                        desc=desc, error=str(e)
                    )
                ) from e

        return wrapper

    if func:
        # Parametresiz çağrı: @safe_api
        return decorator(func)
    # Parametreli çağrı: @safe_api(description="...")
    return decorator


class OgcapiCoreMixin(models.AbstractModel):
    _name = "ogcapi.core.mixin"
    _description = "OGC API Core Mixin"

    # Exceptions

    def raise_bad_request(self, message=None):
        """Throws a standard BadRequestException"""
        message = message or _("Bad request")
        raise BadRequestException(message)

    def raise_not_found(self, message=None):
        """Throws a standard NotFoundException"""
        message = message or _("Resource not found")
        raise NotFoundException(message)

    def raise_server_error(self, message=None, exception=None):
        """Throws a standard InternalServerErrorException"""
        message = message or _("Internal server error")
        if exception:
            _logger.error("Server error: %s", exception)
        raise InternalServerErrorException(message)

    # Links

    def _make_link(
        self, rel="self", path="", response_format=None, title=None, **kwargs
    ):
        """
        Create a link with the given parameters.
        """
        base_url = self.env["ir.config_parameter"].sudo().get_param("web.base.url")
        fmt, mime = response_format or ("json", "application/json")
        kwargs["f"] = fmt
        query_string = urlencode(kwargs) if kwargs else ""
        format_title = f" [{fmt.upper()}]"
        title = (title or "") + format_title
        return {
            "rel": rel,
            "href": f"{base_url}{path}?{query_string}",
            "type": mime,
            "title": title,
        }

    def _make_links(self, rel="self", path="", title=None, formats=None, **kwargs):
        """
        Create a list of links with the given parameters.
        """
        _logger.info(
            "Creating links for path: %s, rel: %s, formats: %s", path, rel, formats
        )
        response_format = kwargs.get("f", "json")
        params = {**kwargs}
        links = []
        if formats:
            if rel == "self":
                for fmt, mime in formats.items():
                    rel = "alternate" if fmt != response_format else "self"
                    links.append(
                        self._make_link(
                            rel=rel,
                            path=path,
                            response_format=(fmt, mime),
                            title=title,
                            **{**params, "f": fmt},
                        )
                    )
            else:
                fmt = (
                    response_format
                    if response_format in formats
                    else next(iter(formats), "json")
                )
                links.append(
                    self._make_link(
                        rel=rel,
                        path=path,
                        response_format=(fmt, formats[fmt]),
                        title=title,
                        **{**params, "f": fmt},
                    )
                )
        else:
            links.append(self._make_link(rel=rel, path=path, title=title, **params))
        return links

    def get_links(self, op_rel=None, title=None, path_args=None, query_args=None):
        """
        Get links for the API configuration.
        """
        links = []
        op_rel = op_rel or []
        title = (
            title
            or getattr(self, "name", None)
            or getattr(self, "code", None)
            or f"{self._name}-{self.id}"
        )
        for op, rel in op_rel:
            op_record = self.env["ogcapi.api"].search([("code", "=", op)], limit=1)
            if not op_record.exists():
                continue
            path = op_record.path_id.complete_name
            path_title = op_record.path_id.name

            if path_args:
                path = path.format(**path_args)

            new_title = f"{title} - {path_title}"
            query_args = query_args or {}

            links.extend(
                self._make_links(
                    rel=rel,
                    path=path,
                    title=new_title,
                    formats=op_record.get_available_formats(),
                    **(query_args),
                )
            )
        return links

    # Results

    def success_result(self, data, code="Ok", status=200):
        """Returns a successful result with data, code, and status."""
        return {
            "success": True,
            "data": data,
            "code": code,
            "status": status,
        }

    def error_result(self, error, code=None, status=None):
        """Returns an error result with error details, code, and status."""
        err_code = code or getattr(error, "code", "UnknownError")
        if isinstance(error, Exception):
            err_status = status or getattr(error, "status", 500)
        else:
            err_status = 400
        return {
            "success": False,
            "data": None,
            "error": {
                "code": err_code,
                "description": str(error),
                "status": err_status,
            },
            "code": err_code,
            "status": err_status,
        }

    def api_response(self, data=None, error=None, code=None, status=None):
        """Returns a unified API response structure."""
        if error:
            return self.error_result(error, code=code, status=status)
        return self.success_result(data, code=code or "Ok", status=status or 200)

    def handle_exception(self, exception, code=None, status=None):
        """Converts an exception to an error_result."""
        return self.error_result(exception, code=code, status=status)

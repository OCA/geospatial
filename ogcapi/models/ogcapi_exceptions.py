# models/ogcapi_exceptions.py
from odoo import _


class OgcapiException(Exception):
    def __init__(self, message, code=None, status=None):
        self.message = message
        self.code = code
        self.status = status
        super().__init__(message)

    def __str__(self):
        return str(self.message)


class BadRequestException(OgcapiException):
    """400 Bad Request exception"""

    def __init__(self, message=None):
        if message is None:
            message = _("The request is invalid")
        super().__init__(message, code="BadRequest", status=400)


class UnauthorizedException(OgcapiException):
    """401 Unauthorized exception"""

    def __init__(self, message=None):
        if message is None:
            message = _("Unauthorized access")
        super().__init__(message, code="Unauthorized", status=401)


class ForbiddenException(OgcapiException):
    """403 Forbidden exception"""

    def __init__(self, message=None):
        if message is None:
            message = _("Access forbidden")
        super().__init__(message, code="Forbidden", status=403)


class NotFoundException(OgcapiException):
    """404 Not Found exception"""

    def __init__(self, message=None):
        if message is None:
            message = _("Resource not found")
        super().__init__(message, code="NotFound", status=404)


class MethodNotAllowedException(OgcapiException):
    """405 Method Not Allowed exception"""

    def __init__(self, message=None):
        if message is None:
            message = _("Method not allowed")
        super().__init__(message, code="MethodNotAllowed", status=405)


class InternalServerErrorException(OgcapiException):
    """500 Internal Server Error exception"""

    def __init__(self, message=None):
        if message is None:
            message = _("An internal server error occurred")
        super().__init__(message, code="InternalServerError", status=500)

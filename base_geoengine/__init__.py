# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
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
##############################################################################
"""The GeoEngine module"""
from . import geo_model
from . import geo_operators
from . import geo_view
from . import geo_helper
from . import geo_ir
from . import geo_field
from . import geo_point
from . import geo_multipoint
from . import geo_line
from . import geo_multiline
from . import geo_polygon
from . import geo_multipolygon
from . import fields
from .geo_db import init_postgis

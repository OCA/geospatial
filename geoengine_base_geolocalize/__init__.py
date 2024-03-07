# -*- coding: utf-8 -*-
##############################################################################
#
#   Author: Laurent Mignon
#   Copyright (c) 2015 Acsone SA/NV (http://www.acsone.eu)
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
from . import models


def pre_init_hook(cr):
    cr.execute("select find_srid('public', 'res_partner', 'geo_point')")
    srid = cr.fetchone()[0]
    if srid != 3857:
        cr.execute(
            "ALTER TABLE res_partner DROP COLUMN geo_point"
        )

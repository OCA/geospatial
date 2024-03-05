# -*- coding: utf-8 -*-
# Copyright 2024 Tom Blauwendraat <tom@sunflowerweb.nl>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).
# pragma: no-cover


def migrate(cr, version):
    """Drop srid slot in fields, because remapping with different projection
    is not supported column will be recreated with new default """
    cr.execute(
        "alter table ir_model_fields drop column srid"
    )

# Copyright (C) 2019, Open Source Integrators
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


def uninstall_hook(cr, registry):
    cr.execute("UPDATE ir_act_window "
               "SET view_mode=replace(view_mode, ',map', '')"
               "WHERE view_mode LIKE '%,map%';")
    cr.execute("UPDATE ir_act_window "
               "SET view_mode=replace(view_mode, 'map,', '')"
               "WHERE view_mode LIKE '%map,%';")
    cr.execute("DELETE FROM ir_act_window "
               "WHERE view_mode = 'map';")

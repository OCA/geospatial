# Copyright (C) 2019, Open Source Integrators
# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).


def uninstall_hook(cr, registry):
    cr.execute("UPDATE ir_act_window "
               "SET view_mode=replace(view_mode, ',leaflet_map', '')"
               "WHERE view_mode LIKE '%,leaflet_map%';")
    cr.execute("UPDATE ir_act_window "
               "SET view_mode=replace(view_mode, 'leaflet_map,', '')"
               "WHERE view_mode LIKE '%leaflet_map,%';")
    cr.execute("DELETE FROM ir_act_window "
               "WHERE view_mode = 'leaflet_map';")

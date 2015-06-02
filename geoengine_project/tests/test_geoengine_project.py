# -*- coding: utf-8 -*-
#
#
#    Authors: Jonathan Nemry
#    Copyright (c) 2015 Acsone SA/NV (http://www.acsone.eu)
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
import openerp.tests.common as common


class TestGeoengineProjects(common.TransactionCase):

    def setUp(self):
        common.TransactionCase.setUp(self)

    def test_crud_project(self):
        vals = {
            'name': 'Partner Project',
            'street': 'Rue au bois la dame',
            'country_id': self.env.ref('base.be').id,
            'zip': '6800',
        }
        partner_id = self.env['res.partner'].create(vals)
        vals = {
            'name': 'Located Partner',
            'partner_id': partner_id.id,
            'parent_id': self.env.ref('project.all_projects_account').id,
            'description': 'located partner',
        }
        project_id = self.env['project.project'].create(vals)
        project_id.name = 'Other Name'
        domain = [('id', '=', project_id.id)]
        self.assertTrue(
            self.env['project.project'].search(domain),
            'Should find this project')
        project_id.unlink()
        self.assertFalse(
            self.env['project.project'].search(domain),
            'Should not find anymore this project')

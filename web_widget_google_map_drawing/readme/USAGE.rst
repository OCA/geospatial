This module provides an extendable framework and cannot be used on its own.
The following provides information on how to implement it for your own module.

## Drawing Mixin

To ease the implementation of this feature, a mixin class has been defined that you can use in your model

.. code-block:: python

    class GoogleMapDrawingShapeMixin(models.AbstractModel):
        _name = 'google.map.drawing.shape.mixin'
        _description = 'Google Maps Shape Mixin'
        _rec_name = 'shape_name'

        shape_name = fields.Char(string='Name')
        shape_area = fields.Float(string='Area')
        shape_radius = fields.Float(string='Radius')
        shape_description = fields.Text(string='Description')
        shape_type = fields.Selection([
            ('circle', 'Circle'),
            ('polygon', 'Polygon'),
            ('rectangle', 'Rectangle')],
            string='Type', default='polygon', required=True)
        shape_paths = fields.Text(string='Paths')

        @api.multi
        def decode_shape_paths(self):
            self.ensure_one()
            return safe_eval(self.shape_paths)

How to use the widget

.. code-block:: xml

     <field name="shape_paths" widget="map_drawing_shape"/>

How to load shape(s) on `map` view

.. code-block:: xml

    <record id="view_res_partner_area_map" model="ir.ui.view">
        <field name="name">view.res.partner.area.map</field>
        <field name="model">res.partner.area</field>
        <field name="arch" type="xml">
            <map library="drawing" string="Shape">
                <field name="partner_id"/>
                <field name="shape_name"/>
                <field name="shape_description"/>
                <field name="shape_type"/>
                <field name="shape_radius"/>
                <field name="shape_area"/>
                <field name="shape_paths"/>
                <templates>
                    <t t-name="kanban-box">
                        <div class="oe_kanban_global_click">
                            <div class="oe_kanban_details">
                                <strong class="o_kanban_record_title oe_partner_heading">
                                    <field name="shape_name"/>
                                </strong>
                                <div>
                                    <field name="shape_description"/>
                                </div>
                                <div attrs="{'invisible': [('shape_type', 'not in', ['rectangle', 'polygon'])]}">
                                    Area: <field name="shape_area"/>
                                </div>
                                <div attrs="{'invisible': [('shape_type', '!=', 'circle')]}">
                                    Radius: <field name="shape_radius"/>
                                </div>
                            </div>
                        </div>
                    </t>
                </templates>
            </map>
        </field>
    </record>

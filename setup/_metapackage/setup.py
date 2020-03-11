import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo11-addons-oca-geospatial",
    description="Meta package for oca-geospatial Odoo addons",
    version=version,
    install_requires=[
        'odoo11-addon-base_geoengine',
        'odoo11-addon-base_geoengine_demo',
        'odoo11-addon-geoengine_base_geolocalize',
        'odoo11-addon-geoengine_partner',
        'odoo11-addon-geoengine_swisstopo',
        'odoo11-addon-test_base_geoengine',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
    ]
)

import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo12-addons-oca-geospatial",
    description="Meta package for oca-geospatial Odoo addons",
    version=version,
    install_requires=[
        'odoo12-addon-base_geoengine',
        'odoo12-addon-base_geoengine_demo',
        'odoo12-addon-geoengine_bing',
        'odoo12-addon-geoengine_swisstopo',
        'odoo12-addon-test_base_geoengine',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
    ]
)

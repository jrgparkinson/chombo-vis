# chombo-vis
Web app for visualising Chombo AMR data



# Python conversion
To convert hdf5 Chombo files to vtk.js web format:
```console
$ cd /path/to/chombo-vis
$ python3 -m venv .env
$ source env/bin/activate
$ pip install -r requirements.txt
```

Check you have paraview:
```console
$ which pvpython
```
If not you'll need to install
```console
$ sudo apt-get install paraview-python
```

```
$ cd pyconvert
$ python convert.py -i /path/to/file.hdf5 -o /path/to/output_folder/
```


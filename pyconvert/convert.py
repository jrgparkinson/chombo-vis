from pyevtk.hl import imageToVTK, linesToVTK
import xarray as xr
import numpy as np
import subprocess
import os
import json
from chombopy.plotting import PltFile
from pathlib import Path

def create_http_dataset(output_dir, filename, cell_data, point_data, dx):
    """
    Write the data to a HTTPDataSet in the directory output_dir/filename.vti/
    Uses temporary directory output_dir/temp/ to store intermediate .vti files
    :param output_dir:
    :type output_dir:
    :param filename:
    :type filename:
    :param cell_data:
    :type cell_data:
    :param point_data:
    :type point_data:
    :return:
    :rtype:
    """

    temp_dir = os.path.join(output_dir, "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    vti_file = os.path.join(temp_dir, filename)

    finest_refinement = 0 # TODO

    actual_num_cells = 1/dx - 2*finest_refinement
    scaled_dx = 1/actual_num_cells
    temp_filename = imageToVTK(vti_file, cellData=cell_data, pointData=point_data,
                               # origin = (0,0,0), # cell centered data starts here
                               origin = (dx/2, dx/2, dx/2),
                               spacing=(dx, dx, dx))
    data_converter(temp_filename, output_dir)


def data_converter(vti_file, output_dir):
    # TODO: find this path properly (currently hardcoded)
    data_converter = "../../vtk-js/Utilities/DataGenerator/vtk-data-converter.py"

    cmd = "pvpython %s  --input %s --output %s" % (data_converter, vti_file, output_dir)
    print(cmd)
    subprocess.run(cmd,  shell=True)

def create_amr_boxes_dataset(output_dir, filename, boxes):

    temp_dir = os.path.join(output_dir, "temp")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    vti_file = os.path.join(temp_dir, filename)

    x = np.array([0, 10,
         10, 1])

    y = np.array([0, 0,
         0, 0])

    z = np.array([0, 0,
         0, 10])
    temp_filename = linesToVTK(vti_file, x=x, y=y, z=z)
    data_converter(temp_filename, output_dir)


    with open(output_dir.joinpath("boxes.json"), 'w') as outfile:
        json.dump(boxes, outfile)


def create_example_dataset(path, name):
    # Dimensions
    nx, ny, nz = 6, 6, 2
    ncells = nx * ny * nz
    npoints = (nx + 1) * (ny + 1) * (nz + 1)

    # Variables
    pressure = np.random.rand(ncells).reshape((nx, ny, nz), order='C')
    temp = np.random.rand(npoints).reshape((nx + 1, ny + 1, nz + 1))

    create_http_dataset(path, name, {"pressure": pressure}, {"temp": temp})


def get_finest_ref(data):
    return 0

def get_amr_dataset(data):
    """
    Get data on all levels interpolated appropriately for the field required
    :param data:
    :type data:
    :param f:
    :type f:
    :return:
    :rtype:
    """

    finest_level = data.get_levels()[-1]

    finest_ref = get_finest_ref(data)

    finest_data = data.ds_levels[finest_level].drop(['i', 'j', 'k', 'level'])
    finest_dx = finest_data.coords['x'][1] - finest_data.coords['x'][0]
    dom = data.domain_size
    fine_coords = [np.linspace(dom[i] + finest_dx/2,
                               dom[i+data.space_dim]-finest_dx/2,
                               int( (dom[i+data.space_dim] - dom[i])/finest_dx) ) for i in range(data.space_dim)]
    # [finest_ref:-finest_ref]

    # print(fine_coords)
    dataarrays = []

    for level in data.get_levels():
        # da = data.get_level_data(f, level)

        ds = data.ds_levels[level].drop(['i', 'j', 'k', 'level'])

        dsi = ds.interp(x=fine_coords[0], y=fine_coords[1], z=fine_coords[2],
                        method='linear') # use linear interpolation for smoother contours
                        # kwargs={'fill_value': 'extrapolate'})
        # dsi = ds.interp_like(finest_data, method='nearest')

        dataarrays.append(dsi)

        # print(ds)
        # print(dsi)

        # print('stop')

    # Start with finest level and fill unfilled cells with coarser levels
    ds_combined = dataarrays[-1]
    for ds in dataarrays[-2::-1]:
        # ds_combined.combine_first(ds)
        ds_combined = ds_combined.fillna(value=ds)

    # import matplotlib.pyplot as plt
    # plt.pcolormesh(ds)

    print(ds_combined)

    # return_arr = np.asfortranarray(np.flip(np.array(ds_combined[f]), 1),  dtype=np.float32)
    return ds_combined

    # return np.array(data.get_level_data(f))

def convert_chombo(input_file, output_path):

    data = PltFile(input_file)

    data.python_index_ordering = False

    if not data.space_dim == 3:
        print("Error - input file is not 3D")
        return

    output_path = Path(output_path)

    fields_to_include = ["Porosity", "Bulk concentration"]
    fields_to_include = ["Temperature", "Porosity", "Pressure", "zAdvection velocity"]

    print(data.comp_names)

    amr_dataset = get_amr_dataset(data)

    point_data = {f : np.array(amr_dataset[f]) for f in fields_to_include}
    # cell_data = {"porosity": np.array(data.get_level_data("Porosity")),
    #              }

    x, y = data.get_mesh_grid_for_level(data.get_levels()[-1])
    dx = x[1]-x[0]

    num_cells = 1.0/dx

    create_http_dataset(output_path, "fields",
                        cell_data=None,
                        point_data=point_data,
                        dx=dx)

    vtk_boxes = []
    colours = [[1,1,0],
               [1, 0, 0],
               [0, 1, 0],
               [0, 0, 1]]
    dirs = ("x", "y", "z")
    # print(data.domain_size)
    # top_corner = np.array(data.domain_size[data.space_dim:]) - dx / 2

    # Don't do level 0 box
    for level in data.get_levels():
        chombo_boxes = data.levels[level][PltFile.BOXES]
        colour = colours[level]
        x, y = data.get_mesh_grid_for_level(level)
        dx = x[1] - x[0]

        top_corner = np.array(data.domain_size[data.space_dim:]) - dx/2

        print(top_corner)
        print(chombo_boxes)
        for box in chombo_boxes:
            vtk_box = {}
            for i in range(data.space_dim):
                # Note this length goes from the center of one outside to the center of the next
                # If it was face to face, it would be one cell bigger
                vtk_box[dirs[i] + "Length"] = dx*(box[i+data.space_dim] + 1 - box[i])

            center = np.array([dx*(box[i+data.space_dim] + 1 + box[i])/2 for i in range(data.space_dim)])
            # center[2] = top_corner[2] - center[2]
            vtk_box["center"] = list(center)
            vtk_box["colour"] = colour
            vtk_boxes.append(vtk_box)

    print(vtk_boxes)

    # boxes = [{"center": [0.8, 0.8, 0.8], "xLength": 0.8, "yLength":0.8, "zLength":0.8, "colour": [0,1,0]}]
    create_amr_boxes_dataset(output_path, "boxes", vtk_boxes)


if __name__ == "__main__":

    # convert_chombo("../dist/data/plt000608.3d.hdf5", "../dist/data/plt000608-temperature-porosity")

    convert_chombo("/home/parkinsonjl/mushy-layer/examples/3d-darcy-amr/plt000200.3d.hdf5",
                   "../dist/data/3d-amr")

    # create_example_dataset("../dist/data", "example8")

    # create_http_dataset()
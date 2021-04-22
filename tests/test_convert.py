import os
import shutil
import pytest
from pyconvert.convert import convert_chombo, create_example_dataset

DIR = os.path.dirname(os.path.abspath(__file__))

@pytest.fixture(autouse=True)
def delete_output():
  output = DIR + "/data/output/"
  if os.path.exists(output):
    shutil.rmtree(output)

def test_example():
  output_dir = DIR + "/data/output/example"
  create_example_dataset(output_dir, "example")
  assert os.path.exists(output_dir + "/example.vti/data/")

@pytest.mark.parametrize("input,output",
[
  ("plt000200.3d.hdf5", "3d-amr"),
  ("plt000464.3d.hdf5", "3d-uniform"),
])
def test_convert(input, output):
  output_dir = DIR + "/data/output/" + output
  convert_chombo(DIR + "/data/" + input, output_dir)

  assert os.path.exists(output_dir + "/metadata.json")
  assert os.path.exists(output_dir + "/fields.vti/data/")

  

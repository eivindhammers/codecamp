import numpy as np

matrix = np.arange(1, 10).reshape(3, 3)
print(matrix)
print("Shape:", matrix.shape)
print("Mean of col 2:", matrix[:, 1].mean())

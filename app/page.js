"use client";
import React, { useState, useEffect } from "react";

const svgWidth = 600;
const svgHeight = 600;
const sonsArray = ["Son 1", "Son 2", "Son 3"];
const colorOptions = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Yellow", value: "yellow" },
];
const epsilon = 1e-6;

const getAllowedColors = (vertex) => {
  if (Math.abs(vertex.a) < epsilon) {
    return colorOptions.filter((opt) => opt.value === "blue" || opt.value === "yellow");
  } else if (Math.abs(vertex.b) < epsilon) {
    return colorOptions.filter((opt) => opt.value === "red" || opt.value === "yellow");
  } else if (Math.abs(vertex.c) < epsilon) {
    return colorOptions.filter((opt) => opt.value === "red" || opt.value === "blue");
  } else {
    return colorOptions;
  }
};

function getPreferredPiece(division, son, utility) {
  const weights = utility[son];
  const computed = {
    red: weights.red * division.a,
    blue: weights.blue * division.b,
    yellow: weights.yellow * division.c,
  };
  let best = "red";
  if (computed.blue > computed[best]) best = "blue";
  if (computed.yellow > computed[best]) best = "yellow";
  return best;
}

function computeBarycentrics(i, j, n) {
  const a = i / n;
  const b = j / n;
  const c = 1 - (i + j) / n;
  return { a, b, c };
}

function barycentricToCartesian(a, b, c, width, height) {
  const x = a * 0 + b * width + c * (width / 2);
  const y = a * height + b * height;
  return { x, y };
}

function generateGridVertices(n) {
  const grid = [];
  const vertexIndices = [];
  const vertices = [];
  const permutation = [2, 1, 0];
  for (let i = 0; i <= n; i++) {
    grid[i] = [];
    vertexIndices[i] = [];
    for (let j = 0; j <= n - i; j++) {
      const bary = computeBarycentrics(i, j, n);
      const raw = (i + 2 * j) % sonsArray.length;
      let son = sonsArray[permutation[raw]];
      let color = null;
      if (i === n && j === 0) {
        color = "red";
        son = sonsArray[0];
      } else if (i === 0 && j === n) {
        color = "blue";
        son = sonsArray[1];
      } else if (i === 0 && j === 0) {
        color = "yellow";
        son = sonsArray[2];
      }
      const vertex = { i, j, ...bary, winner: son, color };
      grid[i][j] = vertex;
      vertexIndices[i][j] = vertices.length;
      vertices.push(vertex);
    }
  }
  return { grid, vertices, vertexIndices };
}

function generateSubtriangles(grid, vertexIndices, n) {
  const subtriangles = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      if (j < grid[i].length - 1 && grid[i + 1] && grid[i + 1][j] !== undefined) {
        subtriangles.push([
          vertexIndices[i][j],
          vertexIndices[i + 1][j],
          vertexIndices[i][j + 1],
        ]);
      }
      if (grid[i + 1] && j < grid[i + 1].length - 1) {
        subtriangles.push([
          vertexIndices[i + 1][j],
          vertexIndices[i + 1][j + 1],
          vertexIndices[i][j + 1],
        ]);
      }
    }
  }
  return subtriangles;
}

export default function Home() {
  const [gridRes, setGridRes] = useState(20);
  const n = gridRes;
  const width = svgWidth;
  const height = svgHeight;

  const [gridData, setGridData] = useState(() => generateGridVertices(n));
  const [vertices, setVertices] = useState(gridData.vertices);
  const [subtriangles, setSubtriangles] = useState(() =>
    generateSubtriangles(gridData.grid, gridData.vertexIndices, n)
  );

  const [selectedVertexIndex, setSelectedVertexIndex] = useState(null);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0].value);
  const [envyTriangles, setEnvyTriangles] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);

  const [weights, setWeights] = useState({
    "Son 1": { red: 2, blue: 1, yellow: 0 },
    "Son 2": { red: 0, blue: 2, yellow: 1 },
    "Son 3": { red: 1, blue: 0, yellow: 2 },
  });

  useEffect(() => {
    const newGridData = generateGridVertices(n);
    setGridData(newGridData);
    setVertices(newGridData.vertices);
    setSubtriangles(generateSubtriangles(newGridData.grid, newGridData.vertexIndices, n));
    setSelectedVertexIndex(null);
    setEnvyTriangles([]);
    setSelectedDivision(null);
  }, [n]);

  useEffect(() => {
    handleUtilityColoring();
  }, []);

  const handleWeightChange = (son, color, value) => {
    setWeights((prev) => ({
      ...prev,
      [son]: {
        ...prev[son],
        [color]: Number(value),
      },
    }));
  };

  const handleVertexClick = (index) => {
    const v = vertices[index];
    if ((v.i === n && v.j === 0) || (v.i === 0 && v.j === n) || (v.i === 0 && v.j === 0)) {
      return;
    }
    setSelectedVertexIndex(index);
  };

  const handleAssign = () => {
    if (selectedVertexIndex === null) return;
    setVertices((prev) => {
      const newVertices = [...prev];
      newVertices[selectedVertexIndex] = {
        ...newVertices[selectedVertexIndex],
        color: selectedColor,
      };
      findEnvyTriangles(newVertices);
      return newVertices;
    });
    setSelectedVertexIndex(null);
  };

  const handleReset = () => {
    const newGridData = generateGridVertices(n);
    setGridData(newGridData);
    setVertices(newGridData.vertices);
    setSubtriangles(generateSubtriangles(newGridData.grid, newGridData.vertexIndices, n));
    setSelectedVertexIndex(null);
    setEnvyTriangles([]);
    setSelectedDivision(null);
  };

  const handleRandomizeColorings = () => {
    const randomized = vertices.map((v) => {
      if ((v.i === n && v.j === 0) || (v.i === 0 && v.j === n) || (v.i === 0 && v.j === 0)) {
        return v;
      }
      const allowed = getAllowedColors(v);
      const randIndex = Math.floor(Math.random() * allowed.length);
      return { ...v, color: allowed[randIndex].value };
    });
    setVertices(randomized);
    findEnvyTriangles(randomized);
    setSelectedVertexIndex(null);
    setSelectedDivision(null);
  };

  const handleUtilityColoring = () => {
    const updated = vertices.map((v) => {
      if ((v.i === n && v.j === 0) || (v.i === 0 && v.j === n) || (v.i === 0 && v.j === 0)) {
        return v;
      }
      const preferred = getPreferredPiece({ a: v.a, b: v.b, c: v.c }, v.winner, weights);
      return { ...v, color: preferred };
    });
    setVertices(updated);
    findEnvyTriangles(updated);
    setSelectedVertexIndex(null);
    setSelectedDivision(null);
  };

  const findEnvyTriangles = (verticesArray) => {
    const envyTrianglesFound = [];
    for (let tri of subtriangles) {
      const colors = tri.map((idx) => verticesArray[idx].color);
      const sons = tri.map((idx) => verticesArray[idx].winner);
      if (colors.every((c) => c !== null) && new Set(colors).size === 3 && new Set(sons).size === 3) {
        envyTrianglesFound.push(tri);
      }
    }
    setEnvyTriangles(envyTrianglesFound);
  };

  const handleEnvyTriangleClick = (tri) => {
    const v1 = vertices[tri[0]];
    const v2 = vertices[tri[1]];
    const v3 = vertices[tri[2]];
    const division = {
      a: (v1.a + v2.a + v3.a) / 3,
      b: (v1.b + v2.b + v3.b) / 3,
      c: (v1.c + v2.c + v3.c) / 3,
    };
    setSelectedDivision(division);
  };

  let assignment = null;
  if (selectedDivision) {
    const pref1 = getPreferredPiece(selectedDivision, "Son 1", weights);
    const pref2 = getPreferredPiece(selectedDivision, "Son 2", weights);
    const pref3 = getPreferredPiece(selectedDivision, "Son 3", weights);
    assignment = {
      red:
        pref1 === "red"
          ? "Son 1"
          : pref2 === "red"
          ? "Son 2"
          : pref3 === "red"
          ? "Son 3"
          : "?",
      blue:
        pref1 === "blue"
          ? "Son 1"
          : pref2 === "blue"
          ? "Son 2"
          : pref3 === "blue"
          ? "Son 3"
          : "?",
      yellow:
        pref1 === "yellow"
          ? "Son 1"
          : pref2 === "yellow"
          ? "Son 2"
          : pref3 === "yellow"
          ? "Son 3"
          : "?",
    };
  }

  const allowedColors =
    selectedVertexIndex !== null ? getAllowedColors(vertices[selectedVertexIndex]) : colorOptions;

  return (
    <div
      className="min-h-screen bg-white text-gray-800 flex flex-col items-center py-10 space-y-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <h1 className="text-4xl font-light">Envy‑Free Farmland Inheritance</h1>
      <p className="max-w-2xl text-center text-sm text-gray-600">
        Each point in the triangle represents a possible division of a farmland among three sons.
        The three corner points correspond to extreme cases where one son receives the entire farmland.
        Each son has his own utility function (set by the weights below) indicating his preference for the red (left), blue (middle), and yellow (right) portions of the farmland.
        <br /><br />
        <strong>Use of Weights:</strong> The weights you set for each son determine how much he values each portion of the farmland.
        For example, if Son 1’s weights are set to <code>{`{ red: 2, blue: 1, yellow: 0 }`}</code>, then he values the red piece twice as much as the blue piece and does not value the yellow piece at all.
        When the farmland is divided into fractions (a, b, c), the application computes a "utility" for each son by multiplying these fractions by his weights.
        The son’s preferred piece is the one with the highest resulting utility value.
        <br /><br />
        The grid shows how the farmland would be divided; envy‑free subtriangles (highlighted in green) are regions where each son would get his most-preferred piece.
        Click a highlighted region to see the final division and the resulting assignment of farmland pieces (visualized by area) to each son.
      </p>

      <div className="w-full max-w-2xl p-4 border rounded shadow-md bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Application Features</h2>
        <ul className="list-disc ml-6 text-sm text-gray-700">
          <li><strong>SVG farmland Visualization:</strong> A 600×600 triangle represents the farmland, with its corners pre-assigned as extreme divisions.</li>
          <li><strong>Grid & Subtriangles:</strong> The farmland is subdivided into a grid of points and subtriangles, showing various possible divisions.</li>
          <li><strong>Envy‑Free Region Highlighting:</strong> Subtriangles where each vertex is assigned a different color (and thus a different son) are highlighted in green.</li>
          <li><strong>Interactive Division Selection:</strong> Clicking a highlighted subtriangle computes a final division (centroid) of the farmland.</li>
          <li><strong>Dynamic Assignment:</strong> Based on your weight settings, the application calculates each son's preferred piece for the final division.</li>
          <li><strong>Visual farmland Assignment (Area-Based):</strong> The final division is rendered as a horizontal bar split into red (left), blue (middle), and yellow (right) segments, where each segment's area corresponds to its share of the farmland.</li>
          <li><strong>Control Panel – Grid Resolution:</strong> Adjust the grid resolution (n) to change the fineness of the division.</li>
          <li><strong>Control Panel – Manual Color Assignment:</strong> Manually assign colors to individual grid vertices.</li>
          <li><strong>Control Panel – Randomization:</strong> Randomly assign colors to vertices (within allowed choices) as an alternative.</li>
          <li><strong>Control Panel – Reset:</strong> Reset the grid to its initial state.</li>
          <li><strong>Control Panel – Set Weights:</strong> Change the utility weight values for each son for red, blue, and yellow pieces.</li>
        </ul>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <label className="text-sm font-medium">Grid Resolution (n):</label>
        <input
          type="number"
          min="5"
          max="100"
          value={gridRes}
          onChange={(e) => setGridRes(Number(e.target.value))}
          className="p-2 border rounded text-center w-20"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-8">
        <svg width={width} height={height} viewBox="-20 -20 640 640">
          {subtriangles.map((tri, index) => {
            const points = tri
              .map((idx) => {
                const v = vertices[idx];
                const { x, y } = barycentricToCartesian(v.a, v.b, v.c, width, height);
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <polygon
                key={index}
                points={points}
                fill="none"
                stroke="lightgray"
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={`0,${height} ${width},${height} ${width / 2},0`}
            fill="none"
            stroke="#333"
            strokeWidth="3"
          />
          {envyTriangles.map((tri, index) => (
            <polygon
              key={`envy-${index}`}
              points={tri
                .map((idx) => {
                  const v = vertices[idx];
                  const { x, y } = barycentricToCartesian(v.a, v.b, v.c, width, height);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="rgba(34,197,94,0.3)"
              stroke="green"
              strokeWidth="2"
              onClick={() => handleEnvyTriangleClick(tri)}
              style={{ cursor: "pointer" }}
            />
          ))}
          {vertices.map((vertex, index) => {
            const { x, y } = barycentricToCartesian(vertex.a, vertex.b, vertex.c, width, height);
            const isSelected = index === selectedVertexIndex;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={isSelected ? 6 : 4}
                fill={vertex.color ? vertex.color : "gray"}
                stroke="#333"
                strokeWidth={isSelected ? 3 : 1}
                onClick={() => handleVertexClick(index)}
                className="cursor-pointer"
              >
                <title>
                  {`(${vertex.a.toFixed(2)}, ${vertex.b.toFixed(2)}, ${vertex.c.toFixed(2)})` +
                    (vertex.winner ? `, assigned to ${vertex.winner}` : "")}
                </title>
              </circle>
            );
          })}
        </svg>

        <div className="flex flex-col space-y-4 p-4 border border-gray-200 rounded shadow-sm">
          {selectedVertexIndex !== null && (
            <div className="space-y-3">
              <p className="text-sm">
                Vertex #{selectedVertexIndex + 1} (<span className="font-medium">{vertices[selectedVertexIndex].winner}</span>)
              </p>
              <label className="text-sm font-medium">Select Color:</label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="p-2 border rounded text-sm"
              >
                {getAllowedColors(vertices[selectedVertexIndex]).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Assign Color
              </button>
            </div>
          )}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Set Weights</h2>
            {sonsArray.map((son) => (
              <div key={son} className="space-y-1">
                <p className="text-sm font-medium">{son}</p>
                <div className="flex space-x-2">
                  <div className="flex flex-col">
                    <label className="text-xs">Red</label>
                    <input
                      type="number"
                      value={weights[son].red}
                      onChange={(e) => handleWeightChange(son, "red", e.target.value)}
                      className="p-1 border rounded text-center w-16 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs">Blue</label>
                    <input
                      type="number"
                      value={weights[son].blue}
                      onChange={(e) => handleWeightChange(son, "blue", e.target.value)}
                      className="p-1 border rounded text-center w-16 text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs">Yellow</label>
                    <input
                      type="number"
                      value={weights[son].yellow}
                      onChange={(e) => handleWeightChange(son, "yellow", e.target.value)}
                      className="p-1 border rounded text-center w-16 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={handleUtilityColoring}
              className="px-4 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Apply Utility Function
            </button>
          </div>
          <button
            onClick={handleRandomizeColorings}
            className="px-4 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Randomize Colorings
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Reset Vertices
          </button>
        </div>
      </div>

      {envyTriangles.length > 0 ? (
        <p className="text-green-600 text-sm font-medium">
          {envyTriangles.length} envy‑free subtriangle(s) highlighted.
        </p>
      ) : (
        <p className="text-red-600 text-sm font-medium">No envy‑free subtriangle found.</p>
      )}

      {selectedDivision && (
        <div className="mt-4 space-y-4">
          <div className="p-4 border border-gray-200 rounded shadow-sm">
            <p className="text-sm font-medium">Selected farmland Division:</p>
            <p className="text-sm">
              (a: {selectedDivision.a.toFixed(2)}, b: {selectedDivision.b.toFixed(2)}, c: {selectedDivision.c.toFixed(2)})
            </p>
          </div>
          <div className="w-[600px] h-24 border border-gray-300 rounded overflow-hidden flex">
            {(() => {
              const pref1 = getPreferredPiece(selectedDivision, "Son 1", weights);
              const pref2 = getPreferredPiece(selectedDivision, "Son 2", weights);
              const pref3 = getPreferredPiece(selectedDivision, "Son 3", weights);
              const assignment = {
                red:
                  pref1 === "red"
                    ? "Son 1"
                    : pref2 === "red"
                    ? "Son 2"
                    : pref3 === "red"
                    ? "Son 3"
                    : "?",
                blue:
                  pref1 === "blue"
                    ? "Son 1"
                    : pref2 === "blue"
                    ? "Son 2"
                    : pref3 === "blue"
                    ? "Son 3"
                    : "?",
                yellow:
                  pref1 === "yellow"
                    ? "Son 1"
                    : pref2 === "yellow"
                    ? "Son 2"
                    : pref3 === "yellow"
                    ? "Son 3"
                    : "?",
              };
              return (
                <>
                  <div
                    style={{
                      width: `${selectedDivision.a * 100}%`,
                      backgroundColor: "red",
                    }}
                    className="flex items-center justify-center text-white text-sm font-bold"
                  >
                    {assignment.red}
                  </div>
                  <div
                    style={{
                      width: `${selectedDivision.b * 100}%`,
                      backgroundColor: "blue",
                    }}
                    className="flex items-center justify-center text-white text-sm font-bold"
                  >
                    {assignment.blue}
                  </div>
                  <div
                    style={{
                      width: `${selectedDivision.c * 100}%`,
                      backgroundColor: "yellow",
                    }}
                    className="flex items-center justify-center text-gray-800 text-sm font-bold"
                  >
                    {assignment.yellow}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

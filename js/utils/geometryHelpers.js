/**
 * Geometry Helper Utilities
 * Shared geometry operations for 3D model processing
 */

/**
 * Transform a vertex by translation and scaling
 * @param {Object} vertex - Vertex with x, y, z properties
 * @param {number} dx - X translation
 * @param {number} dy - Y translation
 * @param {number} dz - Z translation
 * @param {number} scale - Scaling factor
 * @returns {Object} Transformed vertex
 */
export function transformVertex(vertex, dx, dy, dz, scale) {
    return {
        x: vertex.x * scale + dx,
        y: vertex.y * scale + dy,
        z: vertex.z * scale + dz,
    };
}

/**
 * Offset triangle indices by a value (for mesh merging)
 * @param {Object} triangle - Triangle with v1, v2, v3 indices
 * @param {number} offset - Index offset
 * @returns {Object} Triangle with offset indices
 */
export function offsetTriangleIndices(triangle, offset) {
    return {
        v1: triangle.v1 + offset,
        v2: triangle.v2 + offset,
        v3: triangle.v3 + offset,
    };
}

/**
 * Calculate bounding box of a set of vertices
 * @param {Array} vertices - Array of vertex objects {x, y, z}
 * @returns {Object} Bounding box {min: {x, y, z}, max: {x, y, z}}
 */
export function calculateBounds(vertices) {
    if (!vertices || vertices.length === 0) {
        return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    const bounds = {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity },
    };

    for (const v of vertices) {
        bounds.min.x = Math.min(bounds.min.x, v.x);
        bounds.min.y = Math.min(bounds.min.y, v.y);
        bounds.min.z = Math.min(bounds.min.z, v.z);
        bounds.max.x = Math.max(bounds.max.x, v.x);
        bounds.max.y = Math.max(bounds.max.y, v.y);
        bounds.max.z = Math.max(bounds.max.z, v.z);
    }

    return bounds;
}

/**
 * Merge a mesh into target vertex and triangle arrays
 * @param {Array} targetVertices - Target vertex array
 * @param {Array} targetTriangles - Target triangle array
 * @param {Object} mesh - Mesh with vertices and triangles arrays
 * @param {number} dx - X translation
 * @param {number} dy - Y translation
 * @param {number} dz - Z translation
 * @param {number} scale - Scaling factor
 */
export function mergeMesh(targetVertices, targetTriangles, mesh, dx, dy, dz, scale) {
    if (!mesh || !mesh.vertices || !mesh.triangles) return;

    const offset = targetVertices.length;

    // Add transformed vertices
    for (const v of mesh.vertices) {
        targetVertices.push(transformVertex(v, dx, dy, dz, scale));
    }

    // Add offset triangles
    for (const t of mesh.triangles) {
        targetTriangles.push(offsetTriangleIndices(t, offset));
    }
}

/**
 * Serialize geometry to 3MF XML format
 * @param {Array} vertices - Array of vertices {x, y, z}
 * @param {Array} triangles - Array of triangles {v1, v2, v3}
 * @returns {string} XML string
 */
export function serializeGeometry(vertices, triangles) {
    let xml = '<mesh><vertices>\n';

    for (let i = 0; i < vertices.length; i++) {
        const p = vertices[i];
        xml += `<vertex x="${p.x.toFixed(4)}" y="${p.y.toFixed(4)}" z="${p.z.toFixed(4)}"/>\n`;
    }

    xml += '</vertices><triangles>\n';

    for (let i = 0; i < triangles.length; i++) {
        const f = triangles[i];
        xml += `<triangle v1="${f.v1}" v2="${f.v2}" v3="${f.v3}"/>\n`;
    }

    xml += '</triangles></mesh>';
    return xml;
}

/**
 * Parse 3MF model XML to extract geometries
 * @param {string} xml - XML string from 3MF model file
 * @returns {Object} Object mapping object IDs to geometry data
 */
export function parseModelGeometries(xml) {
    const objects = {};
    const objBlocks = xml.split(/<object/);
    objBlocks.shift(); // Remove empty first element

    for (const block of objBlocks) {
        const idMatch = block.match(/id="([^"]+)"/);
        if (idMatch) {
            const vertices = [];
            const triangles = [];

            // Extract vertices
            const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
            let m;
            while ((m = vRegex.exec(block)) !== null) {
                vertices.push({
                    x: parseFloat(m[1]),
                    y: parseFloat(m[2]),
                    z: parseFloat(m[3]),
                });
            }

            // Extract triangles
            const tRegex = /<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;
            while ((m = tRegex.exec(block)) !== null) {
                triangles.push({
                    v1: parseInt(m[1]),
                    v2: parseInt(m[2]),
                    v3: parseInt(m[3]),
                });
            }

            objects[idMatch[1]] = { vertices, triangles };
        }
    }

    return objects;
}

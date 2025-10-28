"use strict";
/**
 * Data Transfer Objects for DXF Processing API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorResponse = isErrorResponse;
/**
 * Type guard to check if response is an error
 */
function isErrorResponse(response) {
    return response && response.success === false && response.error;
}
//# sourceMappingURL=dxf.models.js.map
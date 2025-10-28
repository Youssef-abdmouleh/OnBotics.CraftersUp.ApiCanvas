"use strict";
/**
 * Data Transfer Objects for DXF Processing API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isErrorResponse = void 0;
/**
 * Type guard to check if response is an error
 */
function isErrorResponse(response) {
    return response && response.success === false && response.error;
}
exports.isErrorResponse = isErrorResponse;
//# sourceMappingURL=dxf.models.js.map
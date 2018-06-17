/**
 * Created by Marc Streit on 01.04.2016.
 */

//the OpenGL context
var gl = null;
//our shader program
var shaderProgram = null;

var canvasWidth = 810;
var canvasHeight = 800;
var aspectRatio = canvasWidth / canvasHeight;

const camera = {
  rotation: {
    x: 0,
    y: 0
  }
};

//rendering context
var context;

//camera and projection settings
var animatedAngle = 0;
var fieldOfViewInRadians = convertDegreeToRadians(30);

var tankTransformationNode;
var tankHeadTransformationNode;

var soldierTransformationNode;
var soldierHeadTransformationNode;

//links to buffer stored on the GPU
var quadVertexBuffer, quadColorBuffer;
var cubeVertexBuffer, cubeColorBuffer, cubeIndexBuffer;

var quadVertices = new Float32Array([
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    1.0, 1.0]);

var quadColors = new Float32Array([
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 1, 1,
    0, 0, 1, 1,
    0, 1, 0, 1,
    0, 0, 0, 1]);

var s = 0.3; //size of cube
var cubeVertices = new Float32Array([
   -s,-s,-s, s,-s,-s, s, s,-s, -s, s,-s,
   -s,-s, s, s,-s, s, s, s, s, -s, s, s,
   -s,-s,-s, -s, s,-s, -s, s, s, -s,-s, s,
   s,-s,-s, s, s,-s, s, s, s, s,-s, s,
   -s,-s,-s, -s,-s, s, s,-s, s, s,-s,-s,
   -s, s,-s, -s, s, s, s, s, s, s, s,-s,
]);

var cubeColors = new Float32Array([
   0,1,1, 0,1,1, 0,1,1, 0,1,1,
   1,0,1, 1,0,1, 1,0,1, 1,0,1,
   1,0,0, 1,0,0, 1,0,0, 1,0,0,
   0,0,1, 0,0,1, 0,0,1, 0,0,1,
   1,1,0, 1,1,0, 1,1,0, 1,1,0,
   0,1,0, 0,1,0, 0,1,0, 0,1,0
]);

var cubeIndices =  new Float32Array([
   0,1,2, 0,2,3,
   4,5,6, 4,6,7,
   8,9,10, 8,10,11,
   12,13,14, 12,14,15,
   16,17,18, 16,18,19,
   20,21,22, 20,22,23
]);

//load the shader resources using a utility function
loadResources({
  vs: 'shader/simple.vs.glsl',
  fs: 'shader/simple.fs.glsl',
  //TASK 5-3
  staticcolorvs: 'shader/static_color.vs.glsl'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);

  //render one frame
  render(0);
});

/**
 * initializes OpenGL context, compile shader, and load buffers
 */
function init(resources) {

  //create a GL context
  gl = createContext(canvasWidth, canvasHeight);

  //in WebGL / OpenGL3 we have to create and use our own shaders for the programmable pipeline
  //create the shader program
  shaderProgram = createProgram(gl, resources.vs, resources.fs);

  //set buffers for quad
  initQuadBuffer();
  //set buffers for cube
  initCubeBuffer();

  //create scenegraph
  rootNode = new SceneGraphNode();

  var quadTransformationMatrix = glm.rotateX(90);
  quadTransformationMatrix = mat4.multiply(mat4.create(), quadTransformationMatrix, glm.translate(0.0,-0.5,0));
  quadTransformationMatrix = mat4.multiply(mat4.create(), quadTransformationMatrix, glm.scale(10.5,10.5,10.5));

  var transformationNode = new TransformationSceneGraphNode(quadTransformationMatrix);
  rootNode.append(transformationNode);

  // TODO probably needs to be moved somewhere else
  // we've got 2 floors now, this floor is the dark green one
  let floor = new RenderSGNode(makeRect(2,2));

  rootNode.append(new TransformationSGNode(glm.transform({translate: [0,-1.5,0], rotateX: -90, scale:3}), [floor]));

  var staticColorShaderNode = new ShaderSceneGraphNode(createProgram(gl, resources.staticcolorvs, resources.fs));
  transformationNode.append(staticColorShaderNode);

  var quadNode = new QuadRenderNode();
  staticColorShaderNode.append(quadNode);

  createTank(rootNode);
  createSoldier(rootNode);
  initInteraction(gl.canvas);
}

// copied from exercise 4 might need to be adjusted
function initInteraction(canvas) {
  const mouse = {
    pos: { x : 0, y : 0},
    leftButtonDown: false
  };
  function toPos(event) {
    //convert to local coordinates
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  canvas.addEventListener('mousedown', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = event.button === 0;
  });
  canvas.addEventListener('mousemove', function(event) {
    const pos = toPos(event);
    const delta = { x : mouse.pos.x - pos.x, y: mouse.pos.y - pos.y };
    //TASK 0-1 add delta mouse to camera.rotation if the left mouse button is pressed
    if(mouse.leftButtonDown){
      camera.rotation.x += delta.x;
      camera.rotation.y += delta.y;
    }
    mouse.pos = pos;
  });
  canvas.addEventListener('mouseup', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = false;
  });

  //register a key handler to reset camera
  document.addEventListener('keypress', function(event) {
    //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    if (event.code === 'KeyR') { //reset camera rotation
      camera.rotation.x = 0;
  		camera.rotation.y = 0;
    }
  });
}

function initQuadBuffer() {

  //create buffer for vertices
  quadVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
  //copy data to GPU
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  //same for the color
  quadColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadColors, gl.STATIC_DRAW);
}

function initCubeBuffer() {

  cubeVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

  cubeColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeColors, gl.STATIC_DRAW);

  cubeIndexBuffer = gl.createBuffer ();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);
}

function createTank(rootNode) {

//  var tankTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle/2));
  /*var tankTransformationMatrix = mat4.create();
  tankTransformationNode = new TransformationSceneGraphNode(tankTransformationMatrix);
  rootNode.append(tankTransformationNode);*/

  var tankTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle));
  tankTransformationMatrix = mat4.multiply(mat4.create(), tankTransformationMatrix, glm.translate(0.3,0.9,0));
  tankTransformationNode = new TransformationSceneGraphNode(tankTransformationMatrix);
  rootNode.append(tankTransformationNode);

  //Drehbares Teil Transformation
  var tankHeadTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle));
  tankHeadTransformationMatrix = mat4.multiply(mat4.create(), tankHeadTransformationMatrix, glm.translate(1,1,0));
  tankHeadTransformationMatrix = mat4.multiply(mat4.create(), tankHeadTransformationMatrix, glm.scale(5,1,1));
  tankHeadTransformationNode = new TransformationSceneGraphNode(tankHeadTransformationMatrix);
  tankTransformationNode.append(tankHeadTransformationNode);

  //DrehbaresTeil Body
  bodyFeuerTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0.1,0.6,0));
  bodyFeuerTransformationMatrix = mat4.multiply(mat4.create(), bodyFeuerTransformationMatrix, glm.scale(1,0.5,0.8));
  var bodyFeuerTransformationNode = new TransformationSceneGraphNode(bodyFeuerTransformationMatrix);
  tankHeadTransformationNode.append(bodyFeuerTransformationNode);
  cubeNode = new CubeRenderNode([0.18, 0.44, 0.66]);
  bodyFeuerTransformationNode.append(cubeNode);

  //Feuerrohr
  var feuerrohrTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateZ(-7));
  feuerrohrTransformationMatrix = mat4.multiply(mat4.create(), feuerrohrTransformationMatrix, glm.translate(-0.6,0.6,0));
  feuerrohrTransformationMatrix = mat4.multiply(mat4.create(), feuerrohrTransformationMatrix, glm.scale(1.5,0.1,0.1));
  var feuerrohrTransformationNode = new TransformationSceneGraphNode(feuerrohrTransformationMatrix);
  tankHeadTransformationNode.append(feuerrohrTransformationNode);
  cubeNode = new CubeRenderNode([1, 0.2, 0.3]);
  feuerrohrTransformationNode.append(cubeNode);

  //Body
  var bodyTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.3,0));
  bodyTransformationMatrix = mat4.multiply(mat4.create(), bodyTransformationMatrix, glm.scale(2,0.6,1));
  var bodyTransformationNode = new TransformationSceneGraphNode(bodyTransformationMatrix);
  tankTransformationNode.append(bodyTransformationNode);
  cubeNode = new CubeRenderNode([0.18, 0.44, 0.86]);
  bodyTransformationNode.append(cubeNode);

  var leftKetteTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.1,s*1));
  leftKetteTransformationMatrix = mat4.multiply(mat4.create(), leftKetteTransformationMatrix, glm.scale(2.5,0.5,0.5));
  var leftKetteTransformationNode = new TransformationSceneGraphNode(leftKetteTransformationMatrix);
  tankTransformationNode.append(leftKetteTransformationNode);
  cubeNode = new CubeRenderNode([0, 0,0]);
  leftKetteTransformationNode.append(cubeNode);

  var rightKetteTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.1,-s*1));
  rightKetteTransformationMatrix = mat4.multiply(mat4.create(), rightKetteTransformationMatrix, glm.scale(2.5,0.5,0.5));
  var rightKetteTransformationNode = new TransformationSceneGraphNode(rightKetteTransformationMatrix);
  tankTransformationNode.append(rightKetteTransformationNode);
  cubeNode = new CubeRenderNode([0, 0,0]);
  rightKetteTransformationNode.append(cubeNode);

}

function createSoldier(rootNode) {

//  var tankTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle/2));
  var soldierTransformationMatrix = mat4.create();
  soldierTransformationNode = new TransformationSceneGraphNode(soldierTransformationMatrix);
  rootNode.append(soldierTransformationNode);

  // Kopf
  var soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle));
  soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), soldierHeadTransformationMatrix, glm.translate(0,1.0,0));
  soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), soldierHeadTransformationMatrix, glm.scale(0.2,0.2,0.2));
  soldierHeadTransformationNode = new TransformationSceneGraphNode(soldierHeadTransformationMatrix);
  soldierTransformationNode.append(soldierHeadTransformationNode);
  cubeNode = new CubeRenderNode([0, 0.168, 0]);
  soldierHeadTransformationNode.append(cubeNode);

  //Rumpf
  var rumpfTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0,0.8,0));
  rumpfTransformationMatrix = mat4.multiply(mat4.create(), rumpfTransformationMatrix, glm.scale(0.6,0.5,0.2));
  var rumpfTransformationNode = new TransformationSceneGraphNode(rumpfTransformationMatrix);
  soldierTransformationNode.append(rumpfTransformationNode);
  cubeNode = new CubeRenderNode([0, 0.168, 0]);
  rumpfTransformationNode.append(cubeNode);


  //Bein l
  var lBeinTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0.1,0.5,0));
  lBeinTransformationMatrix = mat4.multiply(mat4.create(), lBeinTransformationMatrix, glm.scale(0.2,0.5,0.2));
  var lBeinTransformationNode = new TransformationSceneGraphNode(lBeinTransformationMatrix);
  soldierTransformationNode.append(lBeinTransformationNode);
  cubeNode = new CubeRenderNode([0, 0.168, 0]);
  lBeinTransformationNode.append(cubeNode);

  //Bein r
  var rBeinTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(-0.1,0.5,0));
  rBeinTransformationMatrix = mat4.multiply(mat4.create(), rBeinTransformationMatrix, glm.scale(0.2,0.5,0.2));
  var rBeinTransformationNode = new TransformationSceneGraphNode(rBeinTransformationMatrix);
  soldierTransformationNode.append(rBeinTransformationNode);
  cubeNode = new CubeRenderNode([0, 0.168, 0]);
  rBeinTransformationNode.append(cubeNode);

  //Arm r
  var rArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(0.2,0.8,0));
  rArmTransformationMatrix = mat4.multiply(mat4.create(), rArmTransformationMatrix, glm.scale(0.2,0.5,0.2));
  var rArmTransformationNode = new TransformationSceneGraphNode(rArmTransformationMatrix);
  soldierTransformationNode.append(rArmTransformationNode);
  cubeNode = new CubeRenderNode([0, 0.168, 0]);
  rArmTransformationNode.append(cubeNode);

  //Arm l
  var lArmTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(-0.2,0.8,0));
  lArmTransformationMatrix = mat4.multiply(mat4.create(), lArmTransformationMatrix, glm.scale(0.2,0.5,0.2));
  var lArmTransformationNode = new TransformationSceneGraphNode(lArmTransformationMatrix);
  soldierTransformationNode.append(lArmTransformationNode);
  cubeNode = new CubeRenderNode([0, 0.168, 0]);
  lArmTransformationNode.append(cubeNode);

}

/**
 * render one frame
 */
function render(timeInMilliseconds) {
  checkForWindowResize(gl);

  //set background color to light gray
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  //clear the buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //enable depth test to let objects in front occluse objects further away
  gl.enable(gl.DEPTH_TEST);

  //TASK 1-1
  gl.enable(gl.BLEND);
  //TASK 1-2
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  //activate this shader program
  gl.useProgram(shaderProgram);

  //update transformation of tank for rotation animation
  var tankTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), mat4.create());
  tankTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.translate(-0.00028*timeInMilliseconds+6,0.0,0));
  tankTransformationNode.setMatrix(tankTransformationMatrix);

  //rotate  tankHead
  var tankHeadTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(animatedAngle*(-0.5)));
  tankHeadTransformationNode.setMatrix(tankHeadTransformationMatrix);


  //update transformation of soldier for rotation animation
  var soldierTransformationMatrix = mat4.multiply(mat4.create(), mat4.create(), glm.rotateY(90));

  if(timeInMilliseconds<14000)
  {
    soldierTransformationMatrix = mat4.multiply(mat4.create(), soldierTransformationMatrix, glm.translate(0,-0.3,0));
  }
  else
  {
    soldierTransformationMatrix = mat4.multiply(mat4.create(), soldierTransformationMatrix, glm.translate(0,-0.3,-0.00015*(timeInMilliseconds-14000)));
  }

  soldierTransformationMatrix = mat4.multiply(mat4.create(), soldierTransformationMatrix, glm.scale(1,1,1));
  if(timeInMilliseconds>25000)
  {
    soldierTransformationMatrix = mat4.multiply(mat4.create(), soldierTransformationMatrix, glm.rotateX(90));
  }

  soldierTransformationNode.setMatrix(soldierTransformationMatrix);

  //update transformation of soldier for rotation animation

  var soldierHeadTransformationMatrix = mat4.create();
  if(timeInMilliseconds<13000)
  {
    soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), soldierHeadTransformationMatrix, glm.rotateY(animatedAngle/4));
  }
  else {
    soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), soldierHeadTransformationMatrix, glm.rotateY(animatedAngle*2));
  }
  soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), soldierHeadTransformationMatrix, glm.translate(0,1.0,0));
  soldierHeadTransformationMatrix = mat4.multiply(mat4.create(), soldierHeadTransformationMatrix, glm.scale(0.2,0.2,0.2));
  soldierHeadTransformationNode.setMatrix(soldierHeadTransformationMatrix);


  context = createSceneGraphContext(gl, shaderProgram);

  context.projectionMatrix = mat4.perspective(mat4.create(), glm.deg2rad(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
/*
  if(timeInMilliseconds<1000)
  {
    context.viewMatrix = mat4.lookAt(mat4.create(), [0,1,-0], [-0.0001*timeInMilliseconds+7,0,0], [0,1,0]);
  }
  else
  {
    context.viewMatrix = mat4.lookAt(mat4.create(), [4,2,0], [0,0.5,0], [0,1,0]);
  }*/
//  console.log(timeInMilliseconds);
  switch (true) {
      case (timeInMilliseconds < 8000):
          context.viewMatrix = mat4.lookAt(mat4.create(), [0,1,-0], [-0.0001*timeInMilliseconds+7,0,0], [0,1,0]);
          break;
      case (timeInMilliseconds < 16000):
          context.viewMatrix = mat4.lookAt(mat4.create(), [4,2,0], [0,0.5,0], [0,1,0]);
          break;
      case (timeInMilliseconds < 24000):
          context.viewMatrix = mat4.lookAt(mat4.create(), [0,25,1], [0,0,0], [0,1,0]);
              break;
      case (timeInMilliseconds < 28000):
        context.viewMatrix = mat4.lookAt(mat4.create(), [-10,2,-4], [-0.00028*timeInMilliseconds+6,0,0], [0,1,0]);
              break;
      default:
          context.viewMatrix = mat4.lookAt(mat4.create(), [0,30,1], [0,0,0], [0,1,0]);
          break;
  }

  //TASK 0-2 rotate whole scene according to the mouse rotation stored in
  //camera.rotation.x and camera.rotation.y

  context.sceneMatrix = mat4.multiply(mat4.create(),
                            glm.rotateY(camera.rotation.x),
                            glm.rotateX(camera.rotation.y));

  //rotateNode.matrix = glm.rotateY(timeInMilliseconds*-0.01);
  if(timeInMilliseconds<30000)
  {
  rootNode.render(context);

  //request another render call as soon as possible
  requestAnimationFrame(render);
}
  //animate based on elapsed time
  animatedAngle = timeInMilliseconds/10;
}

function renderCube() {
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
  gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0); //LINE_STRIP
}

function setUpModelViewMatrix(sceneMatrix, viewMatrix) {
  var modelViewMatrix = mat4.multiply(mat4.create(), viewMatrix, sceneMatrix);
  gl.uniformMatrix4fv(gl.getUniformLocation(context.shader, 'u_modelView'), false, modelViewMatrix);
}

/**
 * returns a new rendering context
 * @param gl the gl context
 * @param projectionMatrix optional projection Matrix
 * @returns {ISceneGraphContext}
 */
function createSceneGraphContext(gl, shader) {

  //create a default projection matrix
  projectionMatrix = mat4.perspective(mat4.create(), fieldOfViewInRadians, aspectRatio, 0.01, 10);
  //set projection matrix
  gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_projection'), false, projectionMatrix);

  return {
    gl: gl,
    sceneMatrix: mat4.create(),
    viewMatrix: calculateViewMatrix(),
    projectionMatrix: projectionMatrix,
    shader: shader
  };
}

function calculateViewMatrix() {
  //compute the camera's matrix
  var eye = [0,3,5];
  var center = [0,0,0];
  var up = [0,1,0];
  viewMatrix = mat4.lookAt(mat4.create(), eye, center, up);
  return viewMatrix;
}

/**
 * base node of the scenegraph
 */
class SceneGraphNode {

  constructor() {
    this.children = [];
  }

  /**
   * appends a new child to this node
   * @param child the child to append
   * @returns {SceneGraphNode} the child
   */
  append(child) {
    this.children.push(child);
    return child;
  }

  /**
   * removes a child from this node
   * @param child
   * @returns {boolean} whether the operation was successful
   */
  remove(child) {
    var i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
    }
    return i >= 0;
  };

  /**
   * render method to render this scengraph
   * @param context
   */
  render(context) {

    //render all children
    this.children.forEach(function (c) {
      return c.render(context);
    });
  };
}

/**
 * a quad node that renders floor plane
 */
class QuadRenderNode extends SceneGraphNode {

  render(context) {

    //setting the model view and projection matrix on shader
    setUpModelViewMatrix(context.sceneMatrix, context.viewMatrix);

    var positionLocation = gl.getAttribLocation(context.shader, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    var colorLocation = gl.getAttribLocation(context.shader, 'a_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadColorBuffer);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLocation);

    //TASK 1-3
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_alpha'), 1);

    // draw the bound data as 6 vertices = 2 triangles starting at index 0
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    //render children
    super.render(context);
  }
}

//TASK 4-1
/**
 * a cube node that renders a cube at its local origin
 */
class CubeRenderNode extends SceneGraphNode {

  constructor(color) { //constructor(matrix ,color) {
    super();
    if(color != null)
    {
      this.nodeColor =  color;
    }
    else {
      this.nodeColor =  [1,1,1];
    }

  }

  render(context) {

    //setting the model view and projection matrix on shader
    setUpModelViewMatrix(context.sceneMatrix, context.viewMatrix);

    var positionLocation = gl.getAttribLocation(context.shader, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false,0,0) ;
    gl.enableVertexAttribArray(positionLocation);

    var colorLocation = gl.getAttribLocation(context.shader, 'a_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false,0,0) ;
    gl.enableVertexAttribArray(colorLocation);

    //set alpha value for blending
    //TASK 1-3
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_alpha'), 1);

    var fColorLocation = gl.getUniformLocation(shaderProgram, 'a_color');

    gl.uniform3f(fColorLocation,this.nodeColor[0],this.nodeColor[1],this.nodeColor[2] );

  //  gl.uniform4f(fColorLocation, 0.9, 0.44, 0.86, 1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0); //LINE_STRIP

    //render children
    super.render(context);
  }
}

//TASK 3-0
/**
 * a transformation node, i.e applied a transformation matrix to its successors
 */
class TransformationSceneGraphNode extends SceneGraphNode {
  /**
   * the matrix to apply
   * @param matrix
   */
  constructor(matrix) {
    super();
    this.matrix = matrix || mat4.create();
  }

  render(context) {
    //backup previous one
    var previous = context.sceneMatrix;
    //set current world matrix by multiplying it
    if (previous === null) {
      context.sceneMatrix = mat4.clone(this.matrix);
    }
    else {
      context.sceneMatrix = mat4.multiply(mat4.create(), previous, this.matrix);
    }

    //render children
    super.render(context);
    //restore backup
    context.sceneMatrix = previous;
  }

  setMatrix(matrix) {
    this.matrix = matrix;
  }
}

//TASK 5-0
/**
 * a shader node sets a specific shader for the successors
 */
class ShaderSceneGraphNode extends SceneGraphNode {
  /**
   * constructs a new shader node with the given shader program
   * @param shader the shader program to use
   */
  constructor(shader) {
    super();
    this.shader = shader;
  }

  render(context) {
    //backup prevoius one
    var backup = context.shader;
    //set current shader
    context.shader = this.shader;
    //activate the shader
    context.gl.useProgram(this.shader);
    //set projection matrix
    gl.uniformMatrix4fv(gl.getUniformLocation(context.shader, 'u_projection'),
      false, context.projectionMatrix);
    //render children
    super.render(context);
    //restore backup
    context.shader = backup;
    //activate the shader
    context.gl.useProgram(backup);
  }
};

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

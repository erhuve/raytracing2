
rooms.raytrace2 = function() {

lib3D();

description = `Raytracing to spheres<br>in a fragment shader:<br>Pendulum edition`;

code = {
'init':`

   // ADD INTERACTIVE WIDGETS TO THE HTML PAGE.

   setDescription(description + \`
      <p>
          <input type=range id=red   > red light
      <br><input type=range id=green > green light
      <br><input type=range id=blue  > blue light
      <p>
          <input type=range id=radius> radius
      <p>
         <input type=range id=speed min=1 max=25 value=10> speed
      <p>
          <input type=range id=focal value=10> focal length
          <input type=checkbox id=crazy> Go crazy
   \`);

   // INITIALIZE THE SPHERE DATA.

   S.sc = [];

   let copper  =
       [.15,.05,.025,0,.3,.1,.05,0,.6,.2,.1,3,0,0,0,0];
   let gold    =
       [.25,.15,.025,0,.5,.3,.05,0,1,.6,.1,6,0,0,0,0];
   let lead    =
       [.05,.05,.05,0,.1,.1,.1,0, 1,1,1,5, 0,0,0,0];
   let plastic =
       [.025,.0,.0,0,.5,.0,.0,0, 2,2,2,20, 0,0,0,0];

   S.material = [copper, gold, plastic, lead];
`,
fragment: `
S.setFragmentShader(\`

   // MODIFY STRING TO ADD NUMBER OF SPHERES.

   const int nS = \` + S.sc.length + \`;
   const int nL = 2;

   // LIGHTS AND SPHERES DATA COMES FROM CPU.

   uniform float uX;
   uniform float uY;

   uniform vec3 uLd[nL];
   uniform vec3 uLc[nL];

   uniform vec4 uS[nS];
   uniform mat4 uSm[nS];

   uniform float uTime;
   uniform float uFl;
   uniform bool uCrazy;
   varying vec3 vPos;

   // YOU CAN CHANGE CAMERA FOCAL LENGTH.
   // MAYBE YOU CAN TRY MAKING THIS A SLIDER.

   float fl = uCrazy ? min(uFl, 1000.) * sin(uTime) : uFl / 33. - 3.;

   vec3 stripes(float x) {
      float t = pow(sin(x) *.5 + .5, .1);
      return vec3(t*.7, t*t*.9*cos(uTime), t*t*t*.9*cos(uTime));
   }

   float turbulence(vec3 p) {
      float t = 0., f = 1.;
      for (int i = 0 ; i < 10 ; i++) {
         t += abs(noise(f * p)) / f;
         f *= 2.;
      }
      return t;
   }

   vec3 bgColor = vec3(.3,.4,.5);

   // INTERSECT A RAY WITH A SPHERE.
   // IF NO INTERSECTION, RETURN NEGATIVE VALUE.

   float raySphere(vec3 V, vec3 W, vec4 S) {
      V = V - S.xyz + .001 * W;
      float b = dot(V, W);
      float d = b * b - dot(V, V) + S.w * S.w;
      return d < 0. ? -1. : -b - sqrt(d);
   }

   // PHONG SHADING WITH CAST SHADOWS.

   vec3 shadeSphere(vec3 P, vec3 W, vec4 S, mat4 m) {
      vec3 Ambient  = m[0].rgb;
      vec3 Diffuse  = m[1].rgb;
      vec4 Specular = m[2];

      vec3 N = normalize(P - S.xyz);
      vec3 white = vec3(1.,1.,1.);
      vec3 c = Ambient;
      for (int l = 0 ; l < nL ; l++) {

         // ARE WE SHADOWED BY ANY OTHER SPHERE?

         float t = -1.;
         for (int n = 0 ; n < nS ; n++)
	    t = max(t, raySphere(P, uLd[l], uS[n]));

         // IF NOT, ADD LIGHTING FROM THIS LIGHT

         if (t < 0.) {
            vec3 R = 2. * dot(N, uLd[l]) * N - uLd[l];
            c += uLc[l] *
	         Diffuse * max(0., dot(N, uLd[l]));
            
            c += Ambient + uLc[l] *
	         (Diffuse * max(0., dot(N, uLd[l])) + white * pow(max(0.,dot(R,-W)),.9));
/*****************************************************

	    FOR HOMEWORK:

	    HERE YOU CAN ADD SPECULAR COMPONENT TO c.

*****************************************************/
         
         }
      }

      return c;
   }

   void main() {

      // START WITH SKY COLOR.
      vec3 strp = 6.*vPos + vec3(0., 0., .5*uTime);
      vec3 color = uCrazy ? stripes(strp.x+10.*turbulence(strp/2.)) : bgColor;

      // FORM THE RAY FOR THIS PIXEL.

      vec3 V = vec3(uX,uY,fl);
      vec3 W = normalize(vec3(vPos.xy, -fl));

      // THEN SEE WHAT IT HITS FIRST.

      float tMin = 10000.;
      for (int n = 0 ; n < nS ; n++) {
         float t = raySphere(V, W, uS[n]);
         if (t > 0. && t < tMin) {
	    vec3 P = V + t * W;
            color = shadeSphere(P, W, uS[n], uSm[n]);
	    tMin = t;

/*****************************************************

            FOR HOMEWORK:

	    HERE YOU CAN ADD MIRROR REFLECTIONS.

	    THE KEY IS TO SHOOT A RAY FROM SURFACE
	    POINT P IN REFLECTION DIRECTION R, WHERE:

               R = 2 * dot(N, -W) * N + W

	    THEN LOOP THROUGH ALL SPHERES, TO FIND
	    THE SPHERE (IF ANY) WHICH IS THE FIRST
	    SPHERE HIT BY RAY: P -> W

	    IF A SPHERE WAS HIT, SHADE THAT SPHERE,
	    AND ADD THAT SHADE TO color. YOU CAN
	    TINT THE REFLECTION BY MULTIPLYING BY
	    THE SPECULAR PHONG COLOR: uSm[n][2].rgb

*****************************************************/
            vec3 N = normalize(P - uS[n].xyz);
            vec3 R = 2. * dot(N, -W) * N + W;
            float reflectMin = 10000.;
            for (int n = 0 ; n < nS ; n++) {
               float reflect = raySphere(P, R, uS[n]);
               if (reflect > 0. && reflect < reflectMin) {
                  color += shadeSphere(P, W, uS[n], uSm[n]) * uSm[n][2].rgb;
                  reflectMin = reflect;
               }
            }
         }
      }

      gl_FragColor = vec4(sqrt(color), 1.);
   }
\`);
`,
vertex: `
S.setVertexShader(\`

   attribute vec3 aPos;
   varying   vec3 vPos;

   void main() {
      vPos = aPos;
      gl_Position = vec4(aPos, 1.);
   }

\`)
`,
render: `
   S.setUniform('1f', 'uTime', time);
   S.setUniform('1f', 'uFl', focal.value * 33.);
   S.setUniform('1f', 'uCrazy', crazy.checked);

   // SPECIFY COLORED KEY LIGHT + FILL LIGHT.

   S.setUniform('3fv', 'uLd', [
      .57, .57, .57,
     -.57,-.57,-.57,
   ]);

   // USE SLIDERS TO SET COLOR OF KEY LIGHT.

   let r = red.value   / 100;
   let g = green.value / 100;
   let b = blue.value  / 100;
   S.setUniform('3fv', 'uLc', [
       r,g,b,
       .3,.2,.1
   ]);

   // ANIMATE SPHERE POSITIONS BEFORE RENDERING.

   let sData = [];
   let smData = [];

   let c = Math.cos(time*speed.value),
       s = Math.sin(time*speed.value);

   S.sc[0] = [ s < 0 ? -.58 : -.58 - .3*s, s < 0 ? .35 : .35 + .2*s, -.2, .3, 0,0,0]; 
   S.sc[1] = [ s === 0 ? -.16 : -.16 + .0018*c, .35, -.2, .3, 0,0,0]; 
   S.sc[2] = [ s === 0 ? .26 : .26 + .0018*c, .35, -.2, .3, 0,0,0]; 
   S.sc[3] = [ s > 0 ? .68 : .68 + .3*-s, s > 0 ? .35 : .35 + .2*-s, -.2, .3, 0,0,0]; 

   for (let n = 0 ; n < S.sc.length ; n++) {

      // SPHERE RADIUS IS VARIED VIA SLIDER.

      S.sc[n][3] = .2 + .2 * radius.value / 1000;

      // SEND SPHERE DATA TO GPU AS A FLAT ARRAY.

      for (let i = 0 ; i < 4 ; i++)
         sData.push(S.sc[n][i]);

      smData = smData.concat(S.material[n]);
   }
   S.setUniform('4fv', 'uS', sData);
   S.setUniform('Matrix4fv', 'uSm', false, smData);

   S.gl.drawArrays(S.gl.TRIANGLE_STRIP, 0, 4);
`,
events: `
onDrag = (x,y) => {
   S.setUniform('1f', 'uX', x);
   S.setUniform('1f', 'uY', y);
}
`
};

}


pipeline {
    agent any

    environment {
        PROJECT_NAME = "jenkins"
        OPENSHIFT_SERVER = "https://api.ocp4.smartek.ae:6443"

        QUAY_CREDENTIALS_ID = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        OC_TOKEN_ID = 'oc-token-id'
        
        // Credential IDs for environment variables
        MONGO_URL_CRED_ID = 'mongo-url-cred'
        MONGO_USERNAME_CRED_ID = 'mongo-username-cred'
        MONGO_PASSWORD_CRED_ID = 'mongo-password-cred'
        SECRET_KEY_CRED_ID = 'secret-key-cred'
        CLOUD_NAME_CRED_ID = 'cloudinary-cloud-name-cred'
        CLOUDINARY_API_KEY_CRED_ID = 'cloudinary-api-key-cred'
        CLOUDINARY_API_SECRET_CRED_ID = 'cloudinary-api-secret-cred'
        BACKEND_SERVICE_URL_CRED_ID = 'backend-service-url-cred'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:${BUILD_NUMBER}"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:${BUILD_NUMBER}"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift & Quay.io') {
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'),
                                 usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        
                        # Check if project exists, create if not
                        if oc get project ${PROJECT_NAME} >/dev/null 2>&1; then
                            echo "Project ${PROJECT_NAME} already exists"
                            oc project ${PROJECT_NAME}
                        else
                            echo "Project ${PROJECT_NAME} does not exist, creating it..."
                            oc new-project ${PROJECT_NAME}
                            echo "Project ${PROJECT_NAME} created successfully"
                        fi
                        
                        echo "Successfully logged in to project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build and Push Frontend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/buildah/stable:latest
                            command: ['cat']
                            tty: true
                            securityContext:
                              privileged: true
                              runAsUser: 0
                            resources:
                              requests:
                                memory: "1Gi"
                                cpu: "500m"
                              limits:
                                memory: "3Gi"
                                cpu: "2"
                            env:
                            - name: STORAGE_DRIVER
                              value: overlay
                            volumeMounts:
                            - name: buildah-storage
                              mountPath: /var/lib/containers
                          volumes:
                          - name: buildah-storage
                            emptyDir: {}
                    '''
                }
            }
            steps {
                container('buildah') {
                    withCredentials([
                        usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS'),
                        string(credentialsId: "${BACKEND_SERVICE_URL_CRED_ID}", variable: 'BACKEND_SERVICE_URL')
                    ]) {
                        sh '''
                            echo "=== CHECKING FRONTEND STRUCTURE ==="
                            ls -la frontend/
                            
                            buildah login -u $QUAY_USER -p $QUAY_PASS quay.io
                            
                            # Check for Containerfile and potentially fix it
                            if [ -f "./frontend/Containerfile" ]; then
                                echo "Found Containerfile at ./frontend/Containerfile"
                                
                                # Create a temporary fixed Containerfile
                                echo "Creating fixed Containerfile with fully qualified image names..."
                                sed 's|FROM nginx:alpine|FROM quay.io/jitesoft/nginx:alpine|g; s|FROM node:|FROM quay.io/fedora/nodejs-20:|g' ./frontend/Containerfile > ./frontend/Containerfile.fixed
                                
                                DOCKERFILE_PATH="./frontend/Containerfile.fixed"
                                BUILD_CONTEXT="./frontend"
                                
                                echo "=== CONTAINERFILE CONTENT ==="
                                cat $DOCKERFILE_PATH
                                echo "=== END CONTAINERFILE ==="
                            else
                                echo "ERROR: No Containerfile found in frontend directory!"
                                ls -la ./frontend/
                                exit 1
                            fi
                            
                            echo "Building frontend image with privileged buildah..."
                            echo "Using Containerfile: $DOCKERFILE_PATH"
                            echo "Using build context: $BUILD_CONTEXT"
                            
                            buildah bud \
                                --build-arg VITE_API_BASE_URL="$BACKEND_SERVICE_URL" \
                                --layers=false \
                                --force-rm \
                                --pull-always \
                                -f $DOCKERFILE_PATH \
                                -t ${FRONTEND_IMAGE} \
                                $BUILD_CONTEXT
                            
                            echo "Pushing frontend image to Quay.io..."
                            buildah push ${FRONTEND_IMAGE}
                        '''
                    }
                }
            }
        }
        
        stage('Build and Push Backend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/buildah/stable:latest
                            command: ['cat']
                            tty: true
                            securityContext:
                              privileged: true
                              runAsUser: 0
                            resources:
                              requests:
                                memory: "1Gi"
                                cpu: "500m"
                              limits:
                                memory: "3Gi"
                                cpu: "2"
                            env:
                            - name: STORAGE_DRIVER
                              value: overlay
                            volumeMounts:
                            - name: buildah-storage
                              mountPath: /var/lib/containers
                          volumes:
                          - name: buildah-storage
                            emptyDir: {}
                    '''
                }
            }
            steps {
                container('buildah') {
                    withCredentials([
                        usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS'),
                        string(credentialsId: "${MONGO_URL_CRED_ID}", variable: 'MONGO_URL'),
                        string(credentialsId: "${MONGO_USERNAME_CRED_ID}", variable: 'MONGO_USERNAME'),
                        string(credentialsId: "${MONGO_PASSWORD_CRED_ID}", variable: 'MONGO_PASSWORD'),
                        string(credentialsId: "${SECRET_KEY_CRED_ID}", variable: 'SECRET_KEY'),
                        string(credentialsId: "${CLOUD_NAME_CRED_ID}", variable: 'CLOUD_NAME'),
                        string(credentialsId: "${CLOUDINARY_API_KEY_CRED_ID}", variable: 'API_KEY'),
                        string(credentialsId: "${CLOUDINARY_API_SECRET_CRED_ID}", variable: 'API_SECRET'),
                        string(credentialsId: "${BACKEND_SERVICE_URL_CRED_ID}", variable: 'BACKEND_SERVICE_URL')
                    ]) {
                        sh '''
                            echo "=== CHECKING BACKEND STRUCTURE ==="
                            ls -la backend/
                            
                            buildah login -u $QUAY_USER -p $QUAY_PASS quay.io

                            # Check for backend Containerfile
                            if [ -f "./backend/Containerfile" ]; then
                                echo "Found backend Containerfile at ./backend/Containerfile"
                                
                                # Create a temporary fixed Containerfile
                                echo "Creating fixed Containerfile with fully qualified image names..."
                                sed 's|FROM node:|FROM quay.io/fedora/nodejs-20:|g; s|FROM alpine|FROM quay.io/fedora/alpine:latest|g' ./backend/Containerfile > ./backend/Containerfile.fixed
                                
                                DOCKERFILE_PATH="./backend/Containerfile.fixed"
                                BUILD_CONTEXT="./backend"
                                
                                echo "=== BACKEND CONTAINERFILE CONTENT ==="
                                cat $DOCKERFILE_PATH
                                echo "=== END CONTAINERFILE ==="
                            else
                                echo "ERROR: No backend Containerfile found!"
                                ls -la ./backend/
                                exit 1
                            fi

                            echo "Building backend image with privileged buildah..."
                            echo "Using Containerfile: $DOCKERFILE_PATH"
                            echo "Using build context: $BUILD_CONTEXT"
                            
                            buildah bud \
                                --build-arg MONGO_URL="$MONGO_URL" \
                                --build-arg MONGO_INITDB_ROOT_USERNAME="$MONGO_USERNAME" \
                                --build-arg MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASSWORD" \
                                --build-arg SECRET_KEY="$SECRET_KEY" \
                                --build-arg CORS_ORIGIN="$BACKEND_SERVICE_URL" \
                                --build-arg CLOUD_NAME="$CLOUD_NAME" \
                                --build-arg API_KEY="$API_KEY" \
                                --build-arg API_SECRET="$API_SECRET" \
                                --layers=false \
                                --force-rm \
                                --pull-always \
                                -f $DOCKERFILE_PATH \
                                -t ${BACKEND_IMAGE} \
                                $BUILD_CONTEXT

                            echo "Pushing backend image to Quay.io..."
                            buildah push ${BACKEND_IMAGE}
                        '''
                    }
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([
                    string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'),
                    string(credentialsId: "${MONGO_URL_CRED_ID}", variable: 'MONGO_URL'),
                    string(credentialsId: "${MONGO_USERNAME_CRED_ID}", variable: 'MONGO_USERNAME'),
                    string(credentialsId: "${MONGO_PASSWORD_CRED_ID}", variable: 'MONGO_PASSWORD'),
                    string(credentialsId: "${SECRET_KEY_CRED_ID}", variable: 'SECRET_KEY'),
                    string(credentialsId: "${CLOUD_NAME_CRED_ID}", variable: 'CLOUD_NAME'),
                    string(credentialsId: "${CLOUDINARY_API_KEY_CRED_ID}", variable: 'API_KEY'),
                    string(credentialsId: "${CLOUDINARY_API_SECRET_CRED_ID}", variable: 'API_SECRET'),
                    string(credentialsId: "${BACKEND_SERVICE_URL_CRED_ID}", variable: 'BACKEND_SERVICE_URL')
                ]) {
                    sh '''
                        echo "Deploying applications to OpenShift from Quay.io..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        # Clean up existing resources
                        oc delete all -l app=job-frontend --ignore-not-found=true
                        oc delete all -l app=job-backend --ignore-not-found=true

                        echo "Waiting for cleanup to complete..."
                        sleep 10

                        # Deploy frontend
                        echo "Deploying frontend..."
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        # Deploy backend  
                        echo "Deploying backend..."
                        oc new-app ${BACKEND_IMAGE} --name=job-backend \
                            -e MONGO_URL="$MONGO_URL" \
                            -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USERNAME" \
                            -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASSWORD" \
                            -e SECRET_KEY="$SECRET_KEY" \
                            -e CORS_ORIGIN="$BACKEND_SERVICE_URL" \
                            -e CLOUD_NAME="$CLOUD_NAME" \
                            -e API_KEY="$API_KEY" \
                            -e API_SECRET="$API_SECRET"
                        # Backend route exposure removed - using service communication only

                        echo "Waiting for deployments..."
                        oc rollout status deployment/job-frontend --timeout=300s || echo "Frontend deployment timeout"
                        oc rollout status deployment/job-backend --timeout=300s || echo "Backend deployment timeout"

                        echo "Deployment completed successfully"
                        echo "Frontend route: $(oc get route job-frontend -o jsonpath='{.spec.host}' 2>/dev/null || echo 'Route not ready yet')"
                        echo "Backend service: job-backend.${PROJECT_NAME}.svc.cluster.local:3000"
                        
                        # Show pod status
                        echo "=== POD STATUS ==="
                        oc get pods -l app=job-frontend -o wide || echo "Frontend pods not found"
                        oc get pods -l app=job-backend -o wide || echo "Backend pods not found"
                    '''
                }
            }
        }

        // stage('Deploy with Helm') {
        //     steps {
        //         withCredentials([
        //             string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'),
        //             string(credentialsId: "${MONGO_URL_CRED_ID}", variable: 'MONGO_URL'),
        //             string(credentialsId: "${MONGO_USERNAME_CRED_ID}", variable: 'MONGO_USERNAME'),
        //             string(credentialsId: "${MONGO_PASSWORD_CRED_ID}", variable: 'MONGO_PASSWORD'),
        //             string(credentialsId: "${SECRET_KEY_CRED_ID}", variable: 'SECRET_KEY'),
        //             string(credentialsId: "${CLOUD_NAME_CRED_ID}", variable: 'CLOUD_NAME'),
        //             string(credentialsId: "${CLOUDINARY_API_KEY_CRED_ID}", variable: 'API_KEY'),
        //             string(credentialsId: "${CLOUDINARY_API_SECRET_CRED_ID}", variable: 'API_SECRET'),
        //             string(credentialsId: "${BACKEND_SERVICE_URL_CRED_ID}", variable: 'BACKEND_SERVICE_URL')
        //         ]) {
        //             sh '''
        //                 echo "Deploying applications with Helm..."
        //                 oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
        //                 oc project ${PROJECT_NAME}

        //                 # Determine environment and values file
        //                 ENVIRONMENT="${ENVIRONMENT:-development}"
        //                 VALUES_FILE="./values.${ENVIRONMENT}.yaml"
        //                 
        //                 # Check if environment-specific values file exists, fallback to default
        //                 if [ ! -f "$VALUES_FILE" ]; then
        //                     echo "Environment-specific values file $VALUES_FILE not found, using default values.yaml"
        //                     VALUES_FILE="./values.yaml"
        //                 fi
        //                 
        //                 echo "Using values file: $VALUES_FILE"

        //                 # Install or upgrade the Helm release using local chart
        //                 helm upgrade --install job-portal . \
        //                     -f $VALUES_FILE \
        //                     --set-string frontend.image.repository=quay.io/bilelrifi/job-portal-frontend \
        //                     --set-string frontend.image.tag=${BUILD_NUMBER} \
        //                     --set-string backend.image.repository=quay.io/bilelrifi/job-portal-backend \
        //                     --set-string backend.image.tag=${BUILD_NUMBER} \
        //                     --set-string backend.env.MONGO_URL="$MONGO_URL" \
        //                     --set-string backend.env.MONGO_INITDB_ROOT_USERNAME="$MONGO_USERNAME" \
        //                     --set-string backend.env.MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASSWORD" \
        //                     --set-string backend.env.SECRET_KEY="$SECRET_KEY" \
        //                     --set-string backend.env.CORS_ORIGIN="$BACKEND_SERVICE_URL" \
        //                     --set-string backend.env.CLOUD_NAME="$CLOUD_NAME" \
        //                     --set-string backend.env.API_KEY="$API_KEY" \
        //                     --set-string backend.env.API_SECRET="$API_SECRET" \
        //                     --set-string frontend.env.VITE_API_BASE_URL="$BACKEND_SERVICE_URL" \
        //                     --namespace ${PROJECT_NAME} \
        //                     --wait \
        //                     --timeout=300s

        //                 echo "Deployment completed successfully with Helm"
                        
        //                 # Show deployment status
        //                 echo "=== DEPLOYMENT STATUS ==="
        //                 oc get all -l app.kubernetes.io/instance=job-portal
                        
        //                 echo "Frontend route: $(oc get route job-frontend -o jsonpath='{.spec.host}' 2>/dev/null || echo 'Route not ready yet')"
        //                 echo "Backend service: job-backend.${PROJECT_NAME}.svc.cluster.local:3000"
        //             '''
        //         }
        //     }
        // }
    }

    post {
        always {
            echo 'Pipeline completed'
        }
        success {
            echo 'Pipeline succeeded!'
            echo 'Your frontend application should be accessible at:'
            echo 'Frontend: http://job-frontend-jenkins.apps.ocp4.smartek.ae'
            echo 'Backend is accessible internally via service: job-backend.jenkins.svc.cluster.local:3000'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}